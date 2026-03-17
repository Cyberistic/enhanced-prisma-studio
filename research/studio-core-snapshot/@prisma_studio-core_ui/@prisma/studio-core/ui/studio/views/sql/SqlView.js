import { sql } from "@codemirror/lang-sql";
import { linter, lintGutter } from "@codemirror/lint";
import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Play, Square } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consumeBffRequestDurationMsForSignal } from "../../../../data/bff";
import { createSqlEditorSchemaFromIntrospection } from "../../../../data/sql-editor-schema";
import { getTopLevelSqlStatementAtCursor } from "../../../../data/sql-statements";
import { Button } from "../../../components/ui/button";
import { TableHead } from "../../../components/ui/table";
import { useColumnPinning } from "../../../hooks/use-column-pinning";
import { useIntrospection } from "../../../hooks/use-introspection";
import { Cell } from "../../cell/Cell";
import { getCell } from "../../cell/get-cell";
import { useStudio } from "../../context";
import { DataGrid } from "../../grid/DataGrid";
import { DataGridDraggableHeaderCell } from "../../grid/DataGridDraggableHeaderCell";
import { DataGridHeader } from "../../grid/DataGridHeader";
import { StudioHeader } from "../../StudioHeader";
import { getCodeMirrorDialect, toCodeMirrorSqlNamespace, } from "./sql-editor-config";
import { createSqlEditorKeybindings } from "./sql-editor-keybindings";
import { createSqlLintSource } from "./sql-lint-source";
const DEFAULT_SQL = "select * from ";
const SQL_EDITOR_DRAFT_ID = "sql-editor:draft";
const SQL_EDITOR_STORAGE_KEY = "prisma-studio-sql-editor-state-v1";
const SQL_EDITOR_PERSIST_DEBOUNCE_MS = 250;
const SQL_VIEW_GRID_SCOPE = "sql:view:grid";
const SQL_VIEW_TABLE_NAME = "__sql_result__";
const SQL_VIEW_SCHEMA = "__sql_result__";
const DEFAULT_PAGINATION_STATE = {
    pageIndex: 0,
    pageSize: 25,
};
const SQL_ROW_SELECTION_COLUMN_DEF = {
    id: "__ps_select",
    accessorKey: "__ps_select",
    enablePinning: true,
    enableResizing: false,
    enableSorting: false,
    size: 35,
    minSize: 35,
    header({ table }) {
        void table;
        return (props) => {
            return <TableHead {...props} aria-label="Row selection spacer"/>;
        };
    },
    cell({ row }) {
        void row;
        return (props) => {
            return <Cell data-select="true" {...props}/>;
        };
    },
};
const SqlResultGrid = memo(function SqlResultGrid(props) {
    const { isRunning, paginationState, pinnedColumnIds, result, rowSelectionState, setPaginationState, setPinnedColumnIds, setRowSelectionState, } = props;
    const resultRows = useMemo(() => result.rows, [result]);
    const rows = useMemo(() => {
        return resultRows.map((row, index) => {
            return {
                ...row,
                __ps_rowid: `sql-row-${index}`,
            };
        });
    }, [resultRows]);
    const resultColumnIds = useMemo(() => {
        const ids = [];
        const seenIds = new Set();
        for (const row of resultRows) {
            for (const key of Object.keys(row)) {
                if (seenIds.has(key)) {
                    continue;
                }
                seenIds.add(key);
                ids.push(key);
            }
        }
        return ids;
    }, [resultRows]);
    const columnMetadataById = useMemo(() => {
        const metadata = {};
        for (const columnId of resultColumnIds) {
            const sampleValue = findFirstDefinedValue(resultRows, columnId);
            metadata[columnId] = createSqlResultColumnMetadata(columnId, sampleValue);
        }
        return metadata;
    }, [resultColumnIds, resultRows]);
    const columnDefs = useMemo(() => {
        const dataColumnDefs = resultColumnIds.map((columnId) => {
            const column = columnMetadataById[columnId];
            return {
                accessorKey: columnId,
                enableSorting: false,
                header({ table, header }) {
                    return (props) => {
                        return (<DataGridDraggableHeaderCell table={table} header={header} {...props}>
                <DataGridHeader header={header} column={column}/>
              </DataGridDraggableHeaderCell>);
                    };
                },
                id: columnId,
                meta: column,
                cell({ cell }) {
                    return (props) => {
                        return (<Cell {...props} withContextMenu={false}>
                {getCell({ cell, column })}
              </Cell>);
                    };
                },
            };
        });
        return [...dataColumnDefs, SQL_ROW_SELECTION_COLUMN_DEF];
    }, [columnMetadataById, resultColumnIds]);
    return (<DataGrid columnDefs={columnDefs} isFetching={isRunning} isProcessing={false} onPinnedColumnIdsChange={setPinnedColumnIds} onPaginationChange={setPaginationState} onRowSelectionChange={setRowSelectionState} pageCount={undefined} paginationState={paginationState} pinnedColumnIds={pinnedColumnIds} rowSelectionState={rowSelectionState} rows={rows} selectionScopeKey={SQL_VIEW_GRID_SCOPE}/>);
});
export function SqlView(_props) {
    const { adapter, isDarkMode, onEvent, sqlEditorStateCollection } = useStudio();
    const { data: introspection } = useIntrospection();
    const { pinnedColumnIds, setPinnedColumnIds } = useColumnPinning();
    const initialPersistedSqlDraft = readPersistedSqlDraft({
        sqlEditorStateCollection,
    });
    const abortControllerRef = useRef(null);
    const editorViewRef = useRef(null);
    const runCurrentSqlRef = useRef(() => undefined);
    const persistedSqlDraftRef = useRef(initialPersistedSqlDraft);
    const [editorValue, setEditorValue] = useState(() => {
        return initialPersistedSqlDraft ?? DEFAULT_SQL;
    });
    const hasUserEditedEditorValueRef = useRef(false);
    const latestEditorValueRef = useRef(editorValue);
    const [isRunning, setIsRunning] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [result, setResult] = useState(null);
    const [rowSelectionState, setRowSelectionState] = useState({});
    const [paginationState, setPaginationState] = useState(DEFAULT_PAGINATION_STATE);
    const persistEditorDraft = useCallback((queryText) => {
        if (persistedSqlDraftRef.current === queryText) {
            return;
        }
        const existingState = sqlEditorStateCollection.get(SQL_EDITOR_DRAFT_ID);
        if (!existingState) {
            sqlEditorStateCollection.insert({
                id: SQL_EDITOR_DRAFT_ID,
                queryText,
            });
            persistedSqlDraftRef.current = queryText;
            return;
        }
        if (existingState.queryText === queryText) {
            persistedSqlDraftRef.current = queryText;
            return;
        }
        sqlEditorStateCollection.update(SQL_EDITOR_DRAFT_ID, (draft) => {
            draft.queryText = queryText;
        });
        persistedSqlDraftRef.current = queryText;
    }, [sqlEditorStateCollection]);
    useEffect(() => {
        latestEditorValueRef.current = editorValue;
    }, [editorValue]);
    useEffect(() => {
        if (!hasUserEditedEditorValueRef.current) {
            return;
        }
        if (persistedSqlDraftRef.current === editorValue) {
            return;
        }
        const timeoutId = window.setTimeout(() => {
            persistEditorDraft(editorValue);
        }, SQL_EDITOR_PERSIST_DEBOUNCE_MS);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [editorValue, persistEditorDraft]);
    useEffect(() => {
        return () => {
            const pendingEditorValue = editorViewRef.current?.state.doc.toString() ??
                latestEditorValueRef.current;
            const hasUnsyncedEditorDocChange = pendingEditorValue !== latestEditorValueRef.current;
            if (!hasUserEditedEditorValueRef.current && !hasUnsyncedEditorDocChange) {
                return;
            }
            persistEditorDraft(pendingEditorValue);
        };
    }, [persistEditorDraft]);
    const sqlEditorSchema = useMemo(() => {
        return createSqlEditorSchemaFromIntrospection({
            defaultSchema: adapter.defaultSchema,
            dialect: adapter.capabilities?.sqlDialect ?? "postgresql",
            introspection,
        });
    }, [adapter.capabilities?.sqlDialect, adapter.defaultSchema, introspection]);
    const sqlEditorNamespace = useMemo(() => {
        return toCodeMirrorSqlNamespace(sqlEditorSchema.namespace);
    }, [sqlEditorSchema.namespace]);
    const sqlEditorDialect = useMemo(() => {
        return getCodeMirrorDialect(sqlEditorSchema.dialect);
    }, [sqlEditorSchema.dialect]);
    const sqlLanguageExtension = useMemo(() => {
        return sql({
            defaultSchema: sqlEditorSchema.defaultSchema,
            dialect: sqlEditorDialect,
            schema: sqlEditorNamespace,
        });
    }, [sqlEditorDialect, sqlEditorNamespace, sqlEditorSchema.defaultSchema]);
    const lintSourceBundle = useMemo(() => {
        if (!adapter.capabilities?.sqlEditorLint ||
            !adapterSupportsSqlLint(adapter)) {
            return null;
        }
        return createSqlLintSource({
            lintSql: (details, options) => adapter.sqlLint(details, options),
            schemaVersion: sqlEditorSchema.version,
        });
    }, [adapter, sqlEditorSchema.version]);
    useEffect(() => {
        return () => {
            lintSourceBundle?.dispose();
        };
    }, [lintSourceBundle]);
    const sqlLintExtensions = useMemo(() => {
        if (!lintSourceBundle) {
            return [];
        }
        return [lintGutter(), linter(lintSourceBundle.source, { delay: 500 })];
    }, [lintSourceBundle]);
    const sqlEditorExtensions = useMemo(() => {
        return [
            sqlLanguageExtension,
            EditorView.lineWrapping,
            Prec.highest(keymap.of(createSqlEditorKeybindings({
                runSql: () => {
                    runCurrentSqlRef.current();
                },
            }))),
            ...sqlLintExtensions,
        ];
    }, [sqlLanguageExtension, sqlLintExtensions]);
    async function executeSql(args) {
        const sql = (args?.sqlOverride ?? editorValue).trim();
        if (sql.length === 0 || isRunning) {
            return;
        }
        const startedAt = performance.now();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        setIsRunning(true);
        setErrorMessage(null);
        const [error, rawResult] = await adapter.raw({ sql }, { abortSignal: abortController.signal });
        const durationMs = consumeBffRequestDurationMsForSignal(abortController.signal) ??
            Math.round(performance.now() - startedAt);
        abortControllerRef.current = null;
        setIsRunning(false);
        if (error) {
            const isAbort = error.name === "AbortError";
            const message = isAbort ? "Query cancelled." : error.message;
            setErrorMessage(message);
            if (!isAbort) {
                setResult(null);
            }
            if (!isAbort) {
                onEvent({
                    name: "studio_operation_error",
                    payload: {
                        operation: "raw-query",
                        query: error.query,
                        error,
                    },
                });
            }
            return;
        }
        setResult({
            durationMs,
            rowCount: rawResult.rowCount,
            rows: rawResult.rows,
        });
        setRowSelectionState({});
        setPaginationState(DEFAULT_PAGINATION_STATE);
        setErrorMessage(null);
        onEvent({
            name: "studio_operation_success",
            payload: {
                error: undefined,
                operation: "raw-query",
                query: rawResult.query,
            },
        });
    }
    function getSqlForExecutionFromCursor() {
        const view = editorViewRef.current;
        const fallbackSql = editorValue.trim();
        if (!view || fallbackSql.length === 0) {
            return fallbackSql;
        }
        const statementAtCursor = getTopLevelSqlStatementAtCursor({
            cursorIndex: view.state.selection.main.head,
            sql: editorValue,
        });
        return statementAtCursor?.statement ?? fallbackSql;
    }
    runCurrentSqlRef.current = () => {
        void executeSql({ sqlOverride: getSqlForExecutionFromCursor() });
    };
    function cancelExecution() {
        const controller = abortControllerRef.current;
        if (!controller) {
            return;
        }
        controller.abort();
    }
    return (<div className="flex flex-1 min-h-0 flex-col h-full overflow-hidden">
      <StudioHeader>
        <Button onClick={() => {
            if (isRunning) {
                cancelExecution();
                return;
            }
            void executeSql({ sqlOverride: getSqlForExecutionFromCursor() });
        }} disabled={!isRunning && editorValue.trim().length === 0} size="sm" variant={isRunning ? "outline" : "default"}>
          {isRunning ? (<Square className="size-4"/>) : (<Play className="size-4"/>)}
          {isRunning ? "Cancel" : "Run SQL"}
        </Button>
      </StudioHeader>

      <div className="flex flex-col gap-3 p-3 border-b border-border bg-background">
        <div className="rounded-md border border-border overflow-hidden bg-background">
          <CodeMirror aria-label="SQL editor" basicSetup={{
            foldGutter: false,
        }} className={[
            "[&_.cm-editor]:!border-0 [&_.cm-editor]:font-mono",
            "[&_.cm-gutters]:border-r [&_.cm-gutters]:border-border [&_.cm-gutters]:bg-muted/30",
            "[&_.cm-line]:text-[15px] [&_.cm-scroller]:font-mono",
        ].join(" ")} extensions={sqlEditorExtensions} minHeight="128px" onCreateEditor={(view) => {
            editorViewRef.current = view;
            const cursorIndex = view.state.doc.length;
            view.dispatch({
                selection: {
                    anchor: cursorIndex,
                    head: cursorIndex,
                },
            });
            view.focus();
        }} onChange={(value) => {
            hasUserEditedEditorValueRef.current = true;
            latestEditorValueRef.current = value;
            setEditorValue(value);
        }} placeholder="Write SQL..." theme={isDarkMode ? "dark" : "light"} value={editorValue}/>
        </div>
        {errorMessage ? (<div className="text-sm text-destructive">
            <strong>Query error:</strong> {errorMessage}
          </div>) : null}
        {result ? (<div className="text-xs text-muted-foreground">
            {result.rowCount} row(s) returned in {result.durationMs}ms
          </div>) : null}
      </div>

      <div data-testid="sql-result-grid-container" className="grow min-h-0 flex flex-col">
        {result == null ? null : (<SqlResultGrid isRunning={isRunning} paginationState={paginationState} pinnedColumnIds={pinnedColumnIds} result={result} rowSelectionState={rowSelectionState} setPaginationState={setPaginationState} setPinnedColumnIds={setPinnedColumnIds} setRowSelectionState={setRowSelectionState}/>)}
      </div>
    </div>);
}
function findFirstDefinedValue(rows, columnId) {
    for (const row of rows) {
        const value = row[columnId];
        if (value !== null && value !== undefined) {
            return value;
        }
    }
    return undefined;
}
function createSqlResultColumnMetadata(name, sampleValue) {
    const isArray = Array.isArray(sampleValue);
    const dataTypeGroup = inferDataTypeGroup(sampleValue);
    const dataTypeName = inferDataTypeName(sampleValue);
    return {
        datatype: {
            affinity: dataTypeName,
            format: undefined,
            group: dataTypeGroup,
            isArray,
            isNative: false,
            name: dataTypeName,
            options: [],
            schema: SQL_VIEW_SCHEMA,
        },
        defaultValue: null,
        fkColumn: null,
        fkSchema: null,
        fkTable: null,
        isAutoincrement: false,
        isComputed: false,
        isRequired: false,
        name,
        nullable: true,
        pkPosition: null,
        schema: SQL_VIEW_SCHEMA,
        table: SQL_VIEW_TABLE_NAME,
    };
}
function inferDataTypeGroup(value) {
    if (Array.isArray(value)) {
        return "json";
    }
    if (value instanceof Date) {
        return "datetime";
    }
    switch (typeof value) {
        case "bigint":
        case "number":
            return "numeric";
        case "boolean":
            return "boolean";
        case "string":
            return "string";
        case "object":
            return "json";
        default:
            return "raw";
    }
}
function inferDataTypeName(value) {
    if (Array.isArray(value)) {
        return "array";
    }
    if (value instanceof Date) {
        return "timestamp";
    }
    switch (typeof value) {
        case "bigint":
            return "bigint";
        case "number":
            return "numeric";
        case "boolean":
            return "boolean";
        case "string":
            return "text";
        case "object":
            return "json";
        case "undefined":
            return "unknown";
        default:
            return "raw";
    }
}
function adapterSupportsSqlLint(adapter) {
    return typeof adapter.sqlLint === "function";
}
function readPersistedSqlDraft(args) {
    const { sqlEditorStateCollection } = args;
    const inCollection = sqlEditorStateCollection.get(SQL_EDITOR_DRAFT_ID);
    if (inCollection?.queryText) {
        return inCollection.queryText;
    }
    if (typeof window === "undefined") {
        return null;
    }
    const rawStorageState = window.localStorage.getItem(SQL_EDITOR_STORAGE_KEY);
    if (!rawStorageState) {
        return null;
    }
    try {
        const parsedStorageState = JSON.parse(rawStorageState);
        if (typeof parsedStorageState !== "object" ||
            parsedStorageState == null ||
            Array.isArray(parsedStorageState)) {
            return null;
        }
        const draftRow = parsedStorageState[`s:${SQL_EDITOR_DRAFT_ID}`];
        if (typeof draftRow !== "object" || draftRow == null) {
            return null;
        }
        const draftData = draftRow.data;
        if (typeof draftData !== "object" || draftData == null) {
            return null;
        }
        const queryText = draftData.queryText;
        return typeof queryText === "string" ? queryText : null;
    }
    catch {
        return null;
    }
}
