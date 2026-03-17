import { ColumnDef, Table, useReactTable } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { useCallback, } from "react";
import { flushSync } from "react-dom";
import { omit } from "remeda";
import { Column } from "@/data";
import { Button } from "@/ui/components/ui/button";
import { TableRow } from "@/ui/components/ui/table";
import { cn } from "@/ui/lib/utils";
import { useIntrospection } from "../../../hooks/use-introspection";
import { useIsInserting } from "../../../hooks/use-is-inserting";
import { useNavigation } from "../../../hooks/use-navigation";
import { Cell, focusedCellClassName, focusedStagedCellClassName, stagedCellClassName, } from "../../cell/Cell";
import { getCell } from "../../cell/get-cell";
import { Link, RelationLink } from "../../cell/Link";
import { WriteableCell } from "../../cell/WriteableCell";
import { getColumnPinningStyles } from "../../grid/features/column-pinning";
import { getInput, } from "../../input/get-input";
import { isBackRelationColumnMeta } from "./back-relation-columns";
const STAGED_ROW_DRAFT_ID_KEY = "__ps_draft_id";
export function StagedRows(props) {
    const { activeEditorCellKey, focusedCell, onFocusedCellChange, onEditorNavigate, setActiveEditorCellKey, table: parentTable, stagedRows, setStagedRows, } = props;
    const readonly = Boolean(useIsInserting());
    const { createUrl } = useNavigation();
    const { data: introspection } = useIntrospection();
    function updateStagedRow(rowIndex, partialRow) {
        setStagedRows((prevRows) => {
            const newRows = [...prevRows];
            newRows[rowIndex] = { ...newRows[rowIndex], ...partialRow };
            return newRows;
        });
    }
    function removeStagedRow(rowIndex) {
        setStagedRows((prevRows) => [
            ...prevRows.slice(0, rowIndex),
            ...prevRows.slice(rowIndex + 1),
        ]);
    }
    const closeInsertEditor = useCallback((params) => {
        flushSync(() => {
            setActiveEditorCellKey((current) => current === params.editorCellKey ? null : current);
            onFocusedCellChange({
                columnId: params.columnId,
                rowIndex: params.rowIndex,
            });
        });
    }, [onFocusedCellChange, setActiveEditorCellKey]);
    const columnDefs = Object.values(parentTable.options.columns).map((column) => {
        return {
            ...column,
            cell({ cell }) {
                return (props) => {
                    const { rowIndex, ...propz } = props;
                    if (column.id === "__ps_select") {
                        return (<Cell className="hover:bg-transparent" data-select="true" {...propz}>
                  <Button className="peer shrink-0 border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-background w-full h-full rounded-none border-none" disabled={readonly} onClick={() => removeStagedRow(rowIndex)} variant={null} size="icon">
                    <span className="flex items-center justify-center text-current">
                      <Minus className="opacity-10" size={14}/>
                    </span>
                  </Button>
                </Cell>);
                    }
                    const columnId = String(column.id ?? "");
                    const isFocused = focusedCell?.rowIndex === rowIndex &&
                        focusedCell.columnId === columnId;
                    if (isBackRelationColumnMeta(column.meta)) {
                        return (<Cell {...propz} className={cn(propz.className, isFocused
                                ? focusedStagedCellClassName
                                : stagedCellClassName)} data-focused={isFocused || undefined} data-grid-column-id={columnId} data-grid-visual-row-index={rowIndex} withContextMenu={false}>
                  <div className="flex w-full items-center justify-end">
                    <RelationLink createUrl={createUrl} filterColumn={column.meta.sourceColumn} filterValue={(stagedRows[rowIndex] ?? {})[column.meta.currentColumnName]} introspection={introspection} targetSchema={column.meta.sourceSchema} targetTable={column.meta.sourceTable}/>
                  </div>
                </Cell>);
                    }
                    const columnMeta = column.meta;
                    if (columnMeta.isAutoincrement) {
                        return (<Cell className={cn("italic text-muted-foreground select-none", isFocused && focusedCellClassName)} data-focused={isFocused || undefined} data-grid-column-id={columnId} data-grid-visual-row-index={rowIndex} onMouseDown={() => onFocusedCellChange({
                                columnId,
                                rowIndex,
                            })}>
                  (auto-increment)
                </Cell>);
                    }
                    if (columnMeta.isComputed) {
                        return (<Cell className={cn("italic text-muted-foreground select-none", isFocused && focusedCellClassName)} data-focused={isFocused || undefined} data-grid-column-id={columnId} data-grid-visual-row-index={rowIndex} onMouseDown={() => onFocusedCellChange({
                                columnId,
                                rowIndex,
                            })}>
                  (computed)
                </Cell>);
                    }
                    const editorCellKey = createEditorCellKey(getStagedRowDraftId(stagedRows[rowIndex] ?? {}, rowIndex), columnId);
                    return (<WriteableCell cellComponent={getCell({ cell, column: columnMeta })} containerProps={{
                            ...propz,
                            "data-focused": isFocused || undefined,
                            "data-grid-column-id": columnId,
                            "data-grid-visual-row-index": rowIndex,
                            className: cn(propz.className, isFocused
                                ? focusedStagedCellClassName
                                : stagedCellClassName),
                            onMouseDown(event) {
                                propz.onMouseDown?.(event);
                                if (event.defaultPrevented) {
                                    return;
                                }
                                onFocusedCellChange({
                                    columnId,
                                    rowIndex,
                                });
                            },
                        }} inputComponent={getInput({
                            cell,
                            column: columnMeta,
                            context: "insert",
                            onNavigate(direction) {
                                onEditorNavigate({
                                    columnId,
                                    direction,
                                    rowKey: getStagedRowDraftId(stagedRows[rowIndex] ?? {}, rowIndex),
                                    rowKind: "insert",
                                });
                            },
                            onSubmit(value) {
                                updateStagedRow(rowIndex, { [column.id]: value });
                                closeInsertEditor({
                                    columnId,
                                    editorCellKey,
                                    rowIndex,
                                });
                            },
                            readonly,
                            showSaveAction: false,
                        })} isEditorOpen={activeEditorCellKey === editorCellKey} linkComponent={Link({
                            cell,
                            column: columnMeta,
                            createUrl,
                            introspection,
                        })} onRequestClose={() => closeInsertEditor({
                            columnId,
                            editorCellKey,
                            rowIndex,
                        })} onRequestOpen={() => {
                            onFocusedCellChange({
                                columnId,
                                rowIndex,
                            });
                            setActiveEditorCellKey(editorCellKey);
                        }}/>);
                };
            },
        };
    });
    const table = useReactTable({
        ...parentTable.options,
        columns: columnDefs,
        enableSorting: false,
        onPaginationChange: undefined,
        onSortingChange: undefined,
        data: stagedRows,
        state: omit(parentTable.options.state, ["pagination", "sorting"]),
    });
    return (<>
      {table.getRowModel().rows.map((row, i) => (<TableRow key={i}>
          {row.getVisibleCells().map((cell, j) => {
                if (typeof cell.column.columnDef.cell === "function") {
                    const Cell = cell.column.columnDef.cell(cell.getContext());
                    return (<Cell key={j} {...getColumnPinningStyles(cell.column, "cell")} rowIndex={i}/>);
                }
                return null;
            })}
        </TableRow>))}
    </>);
}
function createEditorCellKey(rowKey, columnId) {
    return `insert:${rowKey}:${columnId}`;
}
function getStagedRowDraftId(row, rowIndex) {
    const draftId = row[STAGED_ROW_DRAFT_ID_KEY];
    return typeof draftId === "string" && draftId.length > 0
        ? draftId
        : `draft-${rowIndex}`;
}
