import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { StudioHeader } from "../studio-header";
import type { StudioOperationEvent } from "../types";

type SqlResultState = {
  durationMs: number;
  rowCount: number;
  rows: Record<string, unknown>[];
};

const DEFAULT_SQL_TEMPLATE = (tableName: string) => {
  return `select * from "${tableName}" limit 25;`;
};

function createOperationEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getErrorAdapterSource(error: unknown): string | undefined {
  if (typeof error !== "object" || error == null || !("adapterSource" in error)) {
    return undefined;
  }

  const adapterSource = (error as { adapterSource?: unknown }).adapterSource;

  if (typeof adapterSource !== "string" || adapterSource.trim().length === 0) {
    return undefined;
  }

  return adapterSource;
}

export function SqlView(props: {
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onOperationEvent: (event: StudioOperationEvent) => void;
  onToggleNavigation: () => void;
  schema: string;
  table: string | null;
}) {
  const {
    adapter,
    isNavigationOpen,
    isIntrospecting,
    onOperationEvent,
    onToggleNavigation,
    schema,
    table,
  } = props;
  const [sqlText, setSqlText] = useState(() =>
    table ? DEFAULT_SQL_TEMPLATE(table) : "",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SqlResultState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!table) {
      return;
    }

    setSqlText((currentSqlText) => {
      if (currentSqlText.trim().length > 0) {
        return currentSqlText;
      }

      return DEFAULT_SQL_TEMPLATE(table);
    });
  }, [table]);

  const resultColumns = useMemo(() => {
    if (!result) {
      return [];
    }

    const seenColumns = new Set<string>();
    const columns: string[] = [];

    for (const resultRow of result.rows) {
      for (const columnName of Object.keys(resultRow)) {
        if (seenColumns.has(columnName)) {
          continue;
        }

        seenColumns.add(columnName);
        columns.push(columnName);
      }
    }

    return columns;
  }, [result]);

  async function runSql() {
    const sql = sqlText.trim();

    if (sql.length === 0 || isRunning) {
      return;
    }

    const startedAt = performance.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsRunning(true);
    setErrorMessage(null);

    const [error, rawResult] = await adapter.raw(
      { sql },
      { abortSignal: abortController.signal },
    );

    abortControllerRef.current = null;
    setIsRunning(false);

    if (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const message = isAbort ? "Query cancelled." : getErrorMessage(error);
      setErrorMessage(message);

      if (!isAbort) {
        setResult(null);
        onOperationEvent({
          eventId: createOperationEventId(),
          name: "studio_operation_error",
          payload: {
            error: {
              adapterSource: getErrorAdapterSource(error),
              message,
            },
            operation: "raw-query",
            query: {
              parameters: [],
              sql,
            },
          },
          timestamp: new Date().toISOString(),
        });
      }

      return;
    }

    setResult({
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      rowCount: rawResult.rowCount,
      rows: rawResult.rows,
    });
    setErrorMessage(null);

    onOperationEvent({
      eventId: createOperationEventId(),
      name: "studio_operation_success",
      payload: {
        operation: "raw-query",
        query: {
          parameters: [],
          sql,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  function cancelExecution() {
    const abortController = abortControllerRef.current;

    if (!abortController) {
      return;
    }

    abortController.abort();
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <StudioHeader
        isNavigationOpen={isNavigationOpen}
        onToggleNavigation={onToggleNavigation}
        endContent={
          <Button
            disabled={!isRunning && sqlText.trim().length === 0}
            size="sm"
            variant={isRunning ? "outline" : "default"}
            onClick={() => {
              if (isRunning) {
                cancelExecution();
                return;
              }

              void runSql();
            }}
          >
            {isRunning ? <Square className="size-4" /> : <Play className="size-4" />}
            {isRunning ? "Cancel" : "Run SQL"}
          </Button>
        }
      >
        <div className="text-xs text-muted-foreground">
          SQL editor · schema: <span className="font-mono text-foreground/80">{schema}</span>
          <span className="mx-1 text-foreground/40">·</span>
          table: <span className="font-mono text-foreground/80">{table ?? "none"}</span>
        </div>
      </StudioHeader>

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="border-b border-border bg-background p-3">
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <Textarea
              className="min-h-44 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0"
              spellCheck={false}
              value={sqlText}
              onChange={(event) => setSqlText(event.currentTarget.value)}
            />
          </div>
          {errorMessage ? (
            <div className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-3">
          {isIntrospecting && !result && !isRunning ? (
            <div className="flex min-h-0 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <div className="rounded-md border border-border/70 p-2">
                <Skeleton className="mb-2 h-8 w-full" />
                <Skeleton className="mb-2 h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : isRunning && !result ? (
            <div className="flex min-h-0 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <div className="rounded-md border border-border/70 p-2">
                <Skeleton className="mb-2 h-8 w-full" />
                <Skeleton className="mb-2 h-8 w-11/12" />
                <Skeleton className="h-8 w-10/12" />
              </div>
            </div>
          ) : result ? (
            <div className="flex min-h-0 flex-col gap-2">
              <div className="text-xs text-muted-foreground">
                {result.rowCount} row{result.rowCount === 1 ? "" : "s"} · {result.durationMs}ms
              </div>

              {resultColumns.length > 0 ? (
                <div className="overflow-auto rounded-md border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {resultColumns.map((columnName) => (
                          <TableHead key={columnName} className="h-9 whitespace-nowrap font-mono text-xs">
                            {columnName}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((resultRow, rowIndex) => (
                        <TableRow key={`sql-row-${rowIndex}`}>
                          {resultColumns.map((columnName) => (
                            <TableCell
                              key={`sql-cell-${rowIndex}-${columnName}`}
                              className="max-w-105 truncate font-mono text-xs"
                            >
                              {String(resultRow[columnName] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Query executed successfully but returned no visible columns.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Run SQL to see results and operation events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
