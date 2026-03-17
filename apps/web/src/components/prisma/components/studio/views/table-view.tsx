import type { Adapter, SortOrderItem } from "@enhanced-prisma-studio/studio-core/data";
import {
  Asterisk,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  KeyRound,
  Pin,
  RefreshCw,
} from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconSearch } from "@/components/prisma/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { ErrorBoundary } from "../../error-boundary";
import { StudioHeader } from "../studio-header";

type IntrospectionResult = Exclude<
  Awaited<ReturnType<Adapter["introspect"]>>[1],
  undefined
>;
type IntrospectedTable = IntrospectionResult["schemas"][string]["tables"][string];

type TableColumn = {
  key: string;
  label: string;
  type: string;
  typeGroup?: string;
  widthPx: number;
  widthClassName: string;
  isPrimary?: boolean;
  isRequired?: boolean;
};

type TableCellCoordinate = {
  columnKey: string;
  rowIndex: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500] as const;
const INFINITE_SCROLL_PAGE_SIZE = 500;
const ROW_MARKER_COLUMN_WIDTH = 40;

export function TableView(props: {
  activeTable: IntrospectedTable | null;
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onPinnedColumnsChange: (columnNames: string[]) => void;
  onToggleNavigation: () => void;
  pinnedColumns: string[];
  schema: string;
  table: string | null;
}) {
  const {
    activeTable,
    adapter,
    isNavigationOpen,
    isIntrospecting,
    onPinnedColumnsChange,
    onToggleNavigation,
    pinnedColumns,
    table,
  } = props;
  const activeTableName = activeTable?.name ?? table ?? "";
  const [isInfiniteScrollEnabled, setIsInfiniteScrollEnabled] = useState(false);
  const [isRowSearchOpen, setIsRowSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [pageDraft, setPageDraft] = useState("1");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrderItem[]>([]);
  const [selectedCell, setSelectedCell] = useState<TableCellCoordinate | null>(
    null,
  );
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<number[]>([]);
  const [rowSelectionAnchor, setRowSelectionAnchor] = useState<number | null>(
    null,
  );
  const [editingCell, setEditingCell] = useState<TableCellCoordinate | null>(
    null,
  );
  const [cellEditorDraft, setCellEditorDraft] = useState("");
  const [cellEditorError, setCellEditorError] = useState<string | null>(null);
  const [isSavingCell, setIsSavingCell] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const rowSearchInputRef = useRef<HTMLInputElement | null>(null);

  const columns = useMemo<TableColumn[]>(() => {
    if (!activeTable) {
      return [];
    }

    return Object.values(activeTable.columns).map((column) => {
      const widthSpec = getColumnWidthSpec(column.datatype.group, column.name);

      return {
        key: column.name,
        label: column.name,
        type: column.datatype.name,
        typeGroup: column.datatype.group,
        widthClassName: widthSpec.className,
        widthPx: widthSpec.widthPx,
        isPrimary:
          typeof column.pkPosition === "number" &&
          Number.isFinite(column.pkPosition) &&
          column.pkPosition > 0,
        isRequired: column.isRequired && !column.nullable,
      };
    });
  }, [activeTable]);

  const primaryColumnNames = useMemo(() => {
    return columns.filter((column) => column.isPrimary).map((column) => column.key);
  }, [columns]);

  const orderedColumns = useMemo(() => {
    if (pinnedColumns.length === 0) {
      return columns;
    }

    const pinned = columns.filter((column) => pinnedColumns.includes(column.key));
    const unpinned = columns.filter((column) => !pinnedColumns.includes(column.key));
    return [...pinned, ...unpinned];
  }, [columns, pinnedColumns]);

  const pinnedColumnLeftOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let runningLeft = ROW_MARKER_COLUMN_WIDTH;

    for (const column of orderedColumns) {
      if (!pinnedColumns.includes(column.key)) {
        continue;
      }

      offsets.set(column.key, runningLeft);
      runningLeft += column.widthPx;
    }

    return offsets;
  }, [orderedColumns, pinnedColumns]);

  const querySearchTerm = searchInput.trim();
  const queryPageIndex = isInfiniteScrollEnabled ? 0 : pageIndex;
  const queryPageSize = isInfiniteScrollEnabled ? INFINITE_SCROLL_PAGE_SIZE : pageSize;

  useEffect(() => {
    if (!isRowSearchOpen) {
      return;
    }

    rowSearchInputRef.current?.focus();
    rowSearchInputRef.current?.select();
  }, [isRowSearchOpen]);

  useEffect(() => {
    if (!activeTable) {
      setRows([]);
      setTotalRowCount(0);
      setRowsError(null);
      setIsLoadingRows(false);
      setSelectedCell(null);
      setSelectedRowIndexes([]);
      setRowSelectionAnchor(null);
      setEditingCell(null);
      setCellEditorDraft("");
      setCellEditorError(null);
      setIsSavingCell(false);
      return;
    }

    let isDisposed = false;
    const abortController = new AbortController();

    async function loadRows() {
      setIsLoadingRows(true);
      setRowsError(null);

      if (!activeTable) {
        return;
      }

      const [error, result] = await adapter.query(
        {
          filter: undefined,
          fullTableSearchTerm:
            querySearchTerm.length > 0 ? querySearchTerm : undefined,
          pageIndex: queryPageIndex,
          pageSize: queryPageSize,
          sortOrder,
          table: activeTable,
        },
        { abortSignal: abortController.signal },
      );

      if (isDisposed) {
        return;
      }

      if (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setRows([]);
        setTotalRowCount(0);
        setRowsError(error.message || "Failed to load table rows.");
        setIsLoadingRows(false);
        return;
      }

      const nextRows = result?.rows ?? [];
      const nextTotalRowCount = parseRowCount(
        result?.filteredRowCount,
        nextRows.length,
      );

      setRows(nextRows);
      setTotalRowCount(Math.max(nextRows.length, nextTotalRowCount));
      setRowsError(null);
      setIsLoadingRows(false);
    }

    void loadRows();

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [
    activeTable,
    adapter,
    queryPageIndex,
    queryPageSize,
    querySearchTerm,
    refreshTick,
    sortOrder,
  ]);

  const pageCount = useMemo(() => {
    if (isInfiniteScrollEnabled) {
      return 1;
    }

    return Math.max(Math.ceil(Math.max(totalRowCount, 1) / pageSize), 1);
  }, [isInfiniteScrollEnabled, pageSize, totalRowCount]);

  const shouldDisablePageControls = isInfiniteScrollEnabled;
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;
  const pageDigitCount = Math.max(
    String(Math.max(pageCount, 1)).length,
    pageDraft.trim().length || 1,
  );

  const visibleRows = rows;
  const selectedRowIndexSet = useMemo(
    () => new Set(selectedRowIndexes),
    [selectedRowIndexes],
  );
  const hasRowSelection = selectedRowIndexes.length > 0;

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPageDraft(String(pageIndex + 1));
  }, [pageIndex]);

  useEffect(() => {
    setPageIndex(0);
    setPageDraft("1");
  }, [activeTableName, querySearchTerm]);

  useEffect(() => {
    setPageIndex(0);
    setPageDraft("1");
  }, [sortOrder]);

  useEffect(() => {
    setSelectedCell(null);
    setSelectedRowIndexes([]);
    setRowSelectionAnchor(null);
    setEditingCell(null);
    setCellEditorDraft("");
    setCellEditorError(null);
    setIsSavingCell(false);
  }, [activeTableName, queryPageIndex, queryPageSize, querySearchTerm, sortOrder]);

  function getColumnSortDirection(columnKey: string) {
    return sortOrder.find((item) => item.column === columnKey)?.direction;
  }

  function toggleColumnSort(columnKey: string) {
    setSortOrder((currentSortOrder) => {
      const currentDirection = currentSortOrder.find(
        (item) => item.column === columnKey,
      )?.direction;

      if (!currentDirection) {
        return [{ column: columnKey, direction: "asc" }];
      }

      if (currentDirection === "asc") {
        return [{ column: columnKey, direction: "desc" }];
      }

      return [];
    });
  }

  function isColumnPinned(columnKey: string) {
    return pinnedColumns.includes(columnKey);
  }

  function toggleColumnPin(columnKey: string) {
    onPinnedColumnsChange((() => {
      const current = pinnedColumns;

      if (current.includes(columnKey)) {
        return current.filter((key) => key !== columnKey);
      }

      return [columnKey, ...current];
    })());
  }

  function isCellSelected(rowIndex: number, columnKey: string) {
    return selectedCell?.rowIndex === rowIndex && selectedCell.columnKey === columnKey;
  }

  function isRowSelected(rowIndex: number) {
    return selectedRowIndexSet.has(rowIndex);
  }

  function clearRowSelection() {
    setSelectedRowIndexes([]);
    setRowSelectionAnchor(null);
  }

  function selectSingleRow(rowIndex: number) {
    setSelectedRowIndexes([rowIndex]);
    setRowSelectionAnchor(rowIndex);
  }

  function selectRowRange(anchorRowIndex: number, rowIndex: number) {
    const rangeStart = Math.min(anchorRowIndex, rowIndex);
    const rangeEnd = Math.max(anchorRowIndex, rowIndex);
    const nextSelection: number[] = [];

    for (let candidateIndex = rangeStart; candidateIndex <= rangeEnd; candidateIndex += 1) {
      nextSelection.push(candidateIndex);
    }

    setSelectedRowIndexes(nextSelection);
  }

  function toggleRowSelection(rowIndex: number) {
    setSelectedRowIndexes((currentSelection) => {
      if (currentSelection.includes(rowIndex)) {
        return currentSelection.filter((candidateIndex) => candidateIndex !== rowIndex);
      }

      return [...currentSelection, rowIndex].sort((leftIndex, rightIndex) => leftIndex - rightIndex);
    });
  }

  function handleRowMarkerClick(
    event: ReactMouseEvent<HTMLButtonElement>,
    rowIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedCell(null);
    setEditingCell(null);
    setCellEditorError(null);

    if (event.shiftKey && rowSelectionAnchor != null) {
      selectRowRange(rowSelectionAnchor, rowIndex);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggleRowSelection(rowIndex);
      setRowSelectionAnchor(rowIndex);
      return;
    }

    selectSingleRow(rowIndex);
  }

  function openCellEditor(coordinate: TableCellCoordinate, cellValue: unknown) {
    setSelectedCell(coordinate);
    setEditingCell(coordinate);
    setCellEditorDraft(formatCellValue(cellValue));
    setCellEditorError(null);
  }

  function closeCellEditor() {
    setEditingCell(null);
    setCellEditorError(null);
    setIsSavingCell(false);
  }

  function handleCellClick(rowIndex: number, columnKey: string, cellValue: unknown) {
    if (hasRowSelection) {
      clearRowSelection();
    }

    openCellEditor({ columnKey, rowIndex }, cellValue);
  }

  async function saveCellEdit() {
    const targetCell = editingCell;

    if (!targetCell || !activeTable) {
      return;
    }

    const targetColumn = columns.find(
      (candidateColumn) => candidateColumn.key === targetCell.columnKey,
    );
    const targetRow = visibleRows[targetCell.rowIndex];

    if (!targetColumn || !targetRow) {
      closeCellEditor();
      return;
    }

    const parsedValue = parseCellEditorValue({
      draftValue: cellEditorDraft,
      typeGroup: targetColumn.typeGroup,
    });

    if (!parsedValue.success) {
      setCellEditorError(parsedValue.error);
      return;
    }

    setCellEditorError(null);
    setIsSavingCell(true);

    const [updateError, updateResult] = await adapter.update(
      {
        changes: {
          [targetCell.columnKey]: parsedValue.value,
        },
        row: targetRow,
        table: activeTable,
      },
      {},
    );

    setIsSavingCell(false);

    if (updateError) {
      setCellEditorError(updateError.message || "Failed to update cell.");
      return;
    }

    const nextRow = updateResult?.row
      ? { ...targetRow, ...updateResult.row }
      : { ...targetRow, [targetCell.columnKey]: parsedValue.value };

    setRows((currentRows) =>
      currentRows.map((candidateRow, candidateIndex) =>
        candidateIndex === targetCell.rowIndex ? nextRow : candidateRow,
      ),
    );
    setSelectedCell(targetCell);
    setEditingCell(null);
    setCellEditorError(null);
  }

  function commitPageDraft(draftValue = pageDraft) {
    if (shouldDisablePageControls) {
      return;
    }

    const nextPage = parsePositiveInteger(draftValue);

    if (nextPage == null) {
      setPageDraft(String(pageIndex + 1));
      return;
    }

    const nextPageIndex = Math.min(Math.max(nextPage, 1), pageCount) - 1;
    setPageIndex(nextPageIndex);
    setPageDraft(String(nextPageIndex + 1));
  }

  function goToFirstPage() {
    if (shouldDisablePageControls || !canPreviousPage) {
      return;
    }

    setPageIndex(0);
  }

  function goToPreviousPage() {
    if (shouldDisablePageControls || !canPreviousPage) {
      return;
    }

    setPageIndex((current) => Math.max(current - 1, 0));
  }

  function goToNextPage() {
    if (shouldDisablePageControls || !canNextPage) {
      return;
    }

    setPageIndex((current) => Math.min(current + 1, pageCount - 1));
  }

  function goToLastPage() {
    if (shouldDisablePageControls || !canNextPage) {
      return;
    }

    setPageIndex(pageCount - 1);
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <StudioHeader
        endContent={
          <Button
            aria-label="Refresh table"
            variant="outline"
            className="size-9"
            onClick={() => setRefreshTick((current) => current + 1)}
          >
            <RefreshCw data-icon="inline-start" />
          </Button>
        }
        isNavigationOpen={isNavigationOpen}
        onToggleNavigation={onToggleNavigation}
      >
        <div
          className={cn(
            "relative h-9 transition-[width] duration-200 ease-out",
            isRowSearchOpen ? "w-56" : "w-9",
          )}
          data-row-search-open={isRowSearchOpen ? "true" : "false"}
        >
          <Button
            aria-label="Global search"
            variant="outline"
            size="icon"
            className={cn(
              "absolute right-0 top-0 size-9 transition-opacity duration-200",
              isRowSearchOpen && "opacity-0 pointer-events-none",
            )}
            onClick={() => setIsRowSearchOpen(true)}
          >
            <IconSearch data-icon="inline-start" />
          </Button>

          <div
            data-row-search-input-wrapper
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 origin-right transition-[opacity,transform] duration-200 ease-out will-change-transform w-56 z-10",
              isRowSearchOpen
                ? "opacity-100 scale-x-100"
                : "opacity-0 scale-x-0 pointer-events-none",
            )}
          >
            <Input
              aria-label="Global search"
              className="h-9 w-full bg-background shadow-none"
              ref={rowSearchInputRef}
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              onBlur={(event) => {
                if (event.currentTarget.value.trim().length > 0) {
                  return;
                }

                setIsRowSearchOpen(false);
              }}
              placeholder="Search rows..."
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="outline"
              className="h-9 shrink-0 items-center gap-1.5 px-3 [&_svg]:shrink-0"
            >
              <span className="inline-flex h-full w-4 items-center justify-center">
                <Filter className="size-4" />
              </span>
              <span className="inline-flex h-full w-4 items-center justify-center">
                <ChevronDown className="size-4 text-muted-foreground" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>id contains</DropdownMenuItem>
            <DropdownMenuItem>completed is false</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" className="h-9 px-5">Insert row</Button>
      </StudioHeader>

      <div className="flex-1 min-h-0 overflow-hidden border-t border-border/70">
        <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
          <div className="min-h-0 overflow-auto **:data-[slot=table-container]:h-full **:data-[slot=table]:h-full **:data-[slot=table-body]:h-full">
            <Table className="table-auto h-full min-w-max">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="transition-colors duration-150 hover:bg-transparent">
                  <TableHead className="w-10 border-r border-border/70 bg-muted/20" />
                  {orderedColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "group relative h-10 min-w-40 border-r border-border/70 px-3 align-middle font-medium whitespace-nowrap transition-[left,background-color,box-shadow] duration-200 ease-out",
                        isColumnPinned(column.key) &&
                          "sticky z-30 bg-card shadow-[1px_0_0_0_hsl(var(--border))]",
                        column.widthClassName,
                      )}
                      style={
                        isColumnPinned(column.key)
                          ? { left: `${pinnedColumnLeftOffsets.get(column.key) ?? ROW_MARKER_COLUMN_WIDTH}px` }
                          : undefined
                      }
                    >
                      <div className="flex min-w-0 items-center gap-1.5 pr-18">
                        {column.isPrimary ? (
                          <KeyRound size={12} className="shrink-0 text-amber-500" />
                        ) : null}
                        {column.isRequired ? (
                          <Asterisk size={12} className="shrink-0 text-red-500" />
                        ) : null}
                        <span className="min-w-0 truncate font-mono text-[13px] text-foreground">
                          {column.label}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground/80">{column.type}</span>
                      </div>
                      <span
                        className={cn(
                          "absolute right-1 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-border bg-background/95 p-1 shadow-sm transition-opacity",
                          isColumnPinned(column.key) || getColumnSortDirection(column.key)
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
                        )}
                      >
                        <button
                          type="button"
                          aria-label={isColumnPinned(column.key) ? "Unpin column" : "Pin column"}
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full",
                            isColumnPinned(column.key)
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground/70 hover:text-foreground",
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleColumnPin(column.key);
                          }}
                        >
                          <Pin size={12} />
                        </button>
                        <button
                          type="button"
                          aria-label="Toggle sort order"
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full",
                            getColumnSortDirection(column.key)
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground/70 hover:text-foreground",
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleColumnSort(column.key);
                          }}
                        >
                          {getColumnSortDirection(column.key) === "asc" ? (
                            <ArrowUp size={12} />
                          ) : getColumnSortDirection(column.key) === "desc" ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </button>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="align-top">
                {!activeTable ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-full px-4 py-3 align-top text-sm text-muted-foreground">
                      {isIntrospecting
                        ? (
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                        )
                        : "Select a table from the sidebar."}
                    </TableCell>
                  </TableRow>
                ) : rowsError ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-full px-4 py-3 align-top text-sm text-red-400">
                      {rowsError}
                    </TableCell>
                  </TableRow>
                ) : isLoadingRows && visibleRows.length === 0 ? (
                  <>
                    {Array.from({ length: 8 }).map((_, rowIndex) => (
                      <TableRow key={`table-skeleton-row-${rowIndex}`} className="hover:bg-transparent">
                        <TableCell className="h-10 w-10 border-r border-border/70 bg-muted/20 px-0" />
                        {orderedColumns.map((column, columnIndex) => (
                          <TableCell
                            key={`table-skeleton-cell-${rowIndex}-${column.key}`}
                            className={cn(
                              "h-10 min-w-40 border-r border-border/70 px-3",
                              column.widthClassName,
                            )}
                          >
                            <Skeleton
                              className={cn(
                                "h-3.5",
                                columnIndex % 3 === 0
                                  ? "w-3/5"
                                  : columnIndex % 3 === 1
                                    ? "w-4/5"
                                    : "w-2/3",
                              )}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                ) : visibleRows.length > 0 ? (
                  <>
                    {visibleRows.map((row, rowIndex) => (
                      <TableRow
                        key={getRowKey(row, rowIndex, primaryColumnNames)}
                        className={cn(
                          "transition-colors duration-150 hover:bg-transparent",
                          isRowSelected(rowIndex) && "bg-accent/10",
                        )}
                      >
                        <TableCell
                          className={cn(
                            "sticky left-0 z-20 h-10 w-10 border-r border-border/70 px-0",
                            isRowSelected(rowIndex) ? "bg-accent/20" : "bg-muted/20",
                          )}
                        >
                          <button
                            type="button"
                            className="flex h-full w-full items-center justify-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                            onClick={(event) => handleRowMarkerClick(event, rowIndex)}
                          >
                            {isRowSelected(rowIndex) ? "●" : rowIndex + 1}
                          </button>
                        </TableCell>
                        {orderedColumns.map((column) => {
                          const isEditingCurrentCell =
                            editingCell?.rowIndex === rowIndex &&
                            editingCell.columnKey === column.key;

                          return (
                            <TableCell
                              key={column.key}
                              className={cn(
                                "h-10 min-w-40 border-r border-border/70 px-0 font-mono text-[13px] text-foreground/95 transition-[left,background-color,box-shadow,outline-color] duration-200 ease-out",
                                isColumnPinned(column.key) &&
                                  "sticky z-10 bg-background shadow-[1px_0_0_0_hsl(var(--border))]",
                                isRowSelected(rowIndex) && "bg-accent/15",
                                column.widthClassName,
                                rowIndex === 0 &&
                                  column.isPrimary &&
                                  "outline-1 outline-sky-400/70 -outline-offset-1",
                                isCellSelected(rowIndex, column.key) &&
                                  "bg-accent/40 outline-2 outline-primary -outline-offset-2",
                              )}
                              style={
                                isColumnPinned(column.key)
                                  ? {
                                      left: `${pinnedColumnLeftOffsets.get(column.key) ?? ROW_MARKER_COLUMN_WIDTH}px`,
                                    }
                                  : undefined
                              }
                            >
                              <Popover
                                open={isEditingCurrentCell}
                                onOpenChange={(nextOpen) => {
                                  if (!nextOpen && isEditingCurrentCell) {
                                    closeCellEditor();
                                  }
                                }}
                              >
                                <PopoverTrigger
                                  className="block h-full w-full cursor-pointer px-3 py-0 text-left"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCellClick(
                                      rowIndex,
                                      column.key,
                                      row[column.key],
                                    );
                                  }}
                                >
                                  <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                    {formatCellValue(row[column.key])}
                                  </span>
                                </PopoverTrigger>
                                {isEditingCurrentCell ? (
                                  <PopoverContent
                                    align="start"
                                    alignOffset={-1}
                                    className="w-(--anchor-width) max-w-none gap-0 p-0"
                                    sideOffset={2}
                                  >
                                    <Input
                                      autoFocus
                                      className="h-9 rounded-none border-0 px-3 font-mono text-[13px] shadow-none focus-visible:ring-0"
                                      value={cellEditorDraft}
                                      onChange={(event) => {
                                        setCellEditorDraft(event.currentTarget.value);
                                        setCellEditorError(null);
                                      }}
                                      onFocus={(event) => {
                                        event.currentTarget.select();
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          void saveCellEdit();
                                          return;
                                        }

                                        if (event.key === "Escape") {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          closeCellEditor();
                                        }
                                      }}
                                    />
                                    {cellEditorError ? (
                                      <p className="px-2 pb-1 text-xs text-red-400">
                                        {cellEditorError}
                                      </p>
                                    ) : null}
                                    <div className="flex flex-row items-center border-t border-border/70 p-2 text-xs">
                                      <button
                                        className="flex flex-row items-center gap-1"
                                        onClick={closeCellEditor}
                                      >
                                        <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-none bg-muted text-[8px] leading-none font-semibold text-muted-foreground">
                                          Esc
                                        </kbd>
                                        <span>Cancel changes</span>
                                      </button>
                                      {isSavingCell ? (
                                        <span className="ml-auto text-[11px] text-muted-foreground">
                                          Saving...
                                        </span>
                                      ) : null}
                                    </div>
                                  </PopoverContent>
                                ) : null}
                              </Popover>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    <TableRow aria-hidden="true" className="h-full border-0 hover:bg-transparent">
                      <TableCell colSpan={columns.length + 1} className="h-full border-0 p-0" />
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-full px-4 py-3 align-top text-sm text-muted-foreground">
                      {querySearchTerm.length > 0 ? "No matching rows" : "No rows found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-b-lg overflow-visible sticky bottom-0 left-0 border-t-0 w-full z-20 p-0">
            <div className="flex items-center justify-between gap-2 py-3 px-2 border-t border-border/70 backdrop-blur-sm bg-background/90">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  aria-label="Pagination"
                  className="inline-flex items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm"
                  role="group"
                >
                  <Button
                    aria-label="Go to first page"
                    variant="outline"
                    size="icon"
                    disabled={shouldDisablePageControls || !canPreviousPage}
                    className={cn(
                      "h-9 w-9 rounded-none border-0 border-r border-input shadow-none",
                      shouldDisablePageControls && "opacity-70",
                    )}
                    onClick={goToFirstPage}
                  >
                    <ChevronsLeft data-icon="inline-start" />
                  </Button>
                  <Button
                    aria-label="Go to previous page"
                    variant="outline"
                    size="icon"
                    disabled={shouldDisablePageControls || !canPreviousPage}
                    className={cn(
                      "h-9 w-9 rounded-none border-0 border-r border-input shadow-none",
                      shouldDisablePageControls && "opacity-70",
                    )}
                    onClick={goToPreviousPage}
                  >
                    <ChevronLeft data-icon="inline-start" />
                  </Button>
                  <div className="flex items-center gap-2 border-r border-input px-3 font-sans text-xs font-medium tabular-nums">
                    <Input
                      aria-label="Page number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      type="text"
                      value={pageDraft}
                      className={cn(
                        "h-9 w-auto min-w-0 rounded-none border-0 px-1 text-right font-sans text-xs tabular-nums shadow-none focus-visible:ring-0",
                        shouldDisablePageControls && "opacity-70",
                      )}
                      style={{ width: `${pageDigitCount + 1}ch` }}
                      readOnly={shouldDisablePageControls}
                      onBlur={(event) => commitPageDraft(event.currentTarget.value)}
                      onChange={(event) => setPageDraft(event.target.value)}
                      onInput={(event) => setPageDraft((event.target as HTMLInputElement).value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }

                        event.preventDefault();
                        commitPageDraft(event.currentTarget.value);
                      }}
                    />
                    <span className="shrink-0">of</span>
                    <span className="shrink-0">{pageCount}</span>
                  </div>

                  <DropdownMenu
                    open={isPageSizeMenuOpen && !shouldDisablePageControls}
                    onOpenChange={(nextOpen) => {
                      if (shouldDisablePageControls) {
                        setIsPageSizeMenuOpen(false);
                        return;
                      }

                      setIsPageSizeMenuOpen(nextOpen);
                    }}
                  >
                    <DropdownMenuTrigger>
                      <Button
                        aria-label="Rows per page"
                        variant="outline"
                        size="sm"
                        disabled={shouldDisablePageControls}
                        className={cn(
                          "h-9 rounded-none border-0 border-r border-input px-3 shadow-none font-sans text-xs font-medium",
                          "justify-between gap-2 whitespace-nowrap",
                          shouldDisablePageControls && "opacity-70",
                        )}
                      >
                        <span>{pageSize} rows per page</span>
                        <ChevronDown data-icon="inline-end" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-44 font-sans">
                      <DropdownMenuRadioGroup
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          const nextPageSize = parsePositiveInteger(value);

                          if (nextPageSize == null) {
                            return;
                          }

                          setPageSize(nextPageSize);
                          setPageIndex(0);
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <DropdownMenuRadioItem
                            key={option}
                            value={String(option)}
                            className="font-sans text-xs"
                          >
                            {option} rows per page
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    aria-label="Go to next page"
                    variant="outline"
                    size="icon"
                    disabled={shouldDisablePageControls || !canNextPage}
                    className={cn(
                      "h-9 w-9 rounded-none border-0 border-r border-input shadow-none",
                      shouldDisablePageControls && "opacity-70",
                    )}
                    onClick={goToNextPage}
                  >
                    <ChevronRight data-icon="inline-start" />
                  </Button>
                  <Button
                    aria-label="Go to last page"
                    variant="outline"
                    size="icon"
                    disabled={shouldDisablePageControls || !canNextPage}
                    className={cn(
                      "h-9 w-9 rounded-none border-0 shadow-none",
                      shouldDisablePageControls && "opacity-70",
                    )}
                    onClick={goToLastPage}
                  >
                    <ChevronsRight data-icon="inline-start" />
                  </Button>
                </div>

                <div
                  className={cn(
                    buttonVariants({ size: "default", variant: "outline" }),
                    "h-9 gap-3 px-3 font-sans text-xs shadow-sm",
                  )}
                >
                  <Switch
                    id="table-infinite-scroll"
                    aria-label="Infinite scroll"
                    size="sm"
                    checked={isInfiniteScrollEnabled}
                    onCheckedChange={(nextValue) =>
                      setIsInfiniteScrollEnabled(Boolean(nextValue))
                    }
                  />
                  <Label
                    className="cursor-pointer font-sans text-xs font-medium"
                    htmlFor="table-infinite-scroll"
                  >
                    infinite scroll
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}

function getColumnWidthSpec(typeGroup: string | undefined, columnName: string) {
  const normalizedColumnName = columnName.toLowerCase();

  if (normalizedColumnName === "id") {
    return { className: "min-w-[340px]", widthPx: 340 };
  }

  if (typeGroup === "boolean") {
    return { className: "min-w-[160px]", widthPx: 160 };
  }

  if (typeGroup === "datetime" || typeGroup === "time") {
    return { className: "min-w-[300px]", widthPx: 300 };
  }

  if (typeGroup === "numeric") {
    return { className: "min-w-[220px]", widthPx: 220 };
  }

  if (typeGroup === "json") {
    return { className: "min-w-[420px]", widthPx: 420 };
  }

  return { className: "min-w-[360px]", widthPx: 360 };
}

function parseRowCount(value: unknown, fallback: number) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
  }

  if (typeof value === "bigint") {
    if (value < 0n) {
      return fallback;
    }

    return value > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(value);
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 0
      ? Math.floor(parsedValue)
      : fallback;
  }

  return fallback;
}

function getRowKey(
  row: Record<string, unknown>,
  rowIndex: number,
  primaryColumnNames: readonly string[],
) {
  if (primaryColumnNames.length === 0) {
    return `row-${rowIndex}`;
  }

  const primaryValues = primaryColumnNames
    .map((columnName) => row[columnName])
    .filter((value) => value != null)
    .map((value) => String(value));

  if (primaryValues.length === primaryColumnNames.length) {
    return primaryValues.join("|");
  }

  return `row-${rowIndex}`;
}

function formatCellValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function parseCellEditorValue(args: {
  draftValue: string;
  typeGroup: string | undefined;
}):
  | {
      success: true;
      value: unknown;
    }
  | {
      error: string;
      success: false;
    } {
  const { draftValue, typeGroup } = args;
  const trimmedDraftValue = draftValue.trim();

  if (typeGroup === "numeric") {
    if (trimmedDraftValue.length === 0) {
      return { success: true, value: null };
    }

    const numericValue = Number(trimmedDraftValue);

    if (!Number.isFinite(numericValue)) {
      return { error: "Enter a valid numeric value.", success: false };
    }

    return { success: true, value: numericValue };
  }

  if (typeGroup === "boolean") {
    if (trimmedDraftValue.length === 0) {
      return { success: true, value: null };
    }

    const normalizedValue = trimmedDraftValue.toLowerCase();

    if (normalizedValue === "true" || normalizedValue === "1") {
      return { success: true, value: true };
    }

    if (normalizedValue === "false" || normalizedValue === "0") {
      return { success: true, value: false };
    }

    return {
      error: "Use true, false, 1, or 0 for boolean values.",
      success: false,
    };
  }

  if (typeGroup === "json") {
    if (trimmedDraftValue.length === 0) {
      return { success: true, value: null };
    }

    try {
      return { success: true, value: JSON.parse(trimmedDraftValue) };
    } catch {
      return { error: "Enter valid JSON.", success: false };
    }
  }

  return { success: true, value: draftValue };
}

function parsePositiveInteger(value: string): number | null {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (
    !Number.isInteger(parsedValue) ||
    !Number.isSafeInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return null;
  }

  return parsedValue;
}
