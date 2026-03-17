import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  widthClassName: string;
  isPrimary?: boolean;
  isRequired?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500] as const;
const INFINITE_SCROLL_PAGE_SIZE = 500;

export function TableView(props: {
  activeTable: IntrospectedTable | null;
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onToggleNavigation: () => void;
  schema: string;
  table: string | null;
}) {
  const {
    activeTable,
    adapter,
    isNavigationOpen,
    isIntrospecting,
    onToggleNavigation,
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
  const [refreshTick, setRefreshTick] = useState(0);
  const rowSearchInputRef = useRef<HTMLInputElement | null>(null);

  const columns = useMemo<TableColumn[]>(() => {
    if (!activeTable) {
      return [];
    }

    return Object.values(activeTable.columns).map((column) => ({
      key: column.name,
      label: column.name,
      type: column.datatype.name,
      widthClassName: getColumnWidthClass(column.datatype.group, column.name),
      isPrimary:
        typeof column.pkPosition === "number" &&
        Number.isFinite(column.pkPosition) &&
        column.pkPosition > 0,
      isRequired: column.isRequired && !column.nullable,
    }));
  }, [activeTable]);

  const primaryColumnNames = useMemo(() => {
    return columns.filter((column) => column.isPrimary).map((column) => column.key);
  }, [columns]);

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
          sortOrder: [],
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
            <Table className="table-fixed h-full">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 border-r border-border/70 bg-muted/20" />
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "h-10 border-r border-border/70 px-3 align-middle font-medium whitespace-nowrap",
                        column.widthClassName,
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {column.isPrimary ? (
                          <KeyRound size={12} className="text-amber-500" />
                        ) : null}
                        {column.isRequired ? (
                          <span className="text-xs font-semibold text-red-500">*</span>
                        ) : null}
                        <span className="font-mono text-[13px] text-foreground">{column.label}</span>
                        <span className="text-xs text-muted-foreground">{column.type}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="align-top">
                {!activeTable ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-full px-4 py-3 align-top text-sm text-muted-foreground">
                      {isIntrospecting
                        ? "Loading table metadata..."
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
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-full px-4 py-3 align-top text-sm text-muted-foreground">
                      Loading rows...
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length > 0 ? (
                  <>
                    {visibleRows.map((row, rowIndex) => (
                      <TableRow
                        key={getRowKey(row, rowIndex, primaryColumnNames)}
                        className="hover:bg-transparent"
                      >
                        <TableCell className="h-10 w-10 border-r border-border/70 bg-muted/20 px-0" />
                        {columns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn(
                              "h-10 border-r border-border/70 px-3 font-mono text-[13px] text-foreground/95",
                              column.widthClassName,
                              rowIndex === 0 && column.isPrimary && "outline-1 outline-sky-400/70 -outline-offset-1",
                            )}
                          >
                            {formatCellValue(row[column.key])}
                          </TableCell>
                        ))}
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
  );
}

function getColumnWidthClass(typeGroup: string | undefined, columnName: string) {
  const normalizedColumnName = columnName.toLowerCase();

  if (normalizedColumnName === "id") {
    return "w-[340px]";
  }

  if (typeGroup === "boolean") {
    return "w-[160px]";
  }

  if (typeGroup === "datetime" || typeGroup === "time") {
    return "w-[300px]";
  }

  if (typeGroup === "numeric") {
    return "w-[220px]";
  }

  if (typeGroup === "json") {
    return "w-[420px]";
  }

  return "w-[360px]";
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
