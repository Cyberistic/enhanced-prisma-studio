import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

import { ErrorBoundary } from "../../error-boundary";
import { StudioHeader } from "../studio-header";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;
type SchemaTables = IntrospectionResult["schemas"][string]["tables"];

const AUDIT_LOG_TABLE_NAME = "AuditLog";

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function resolveLogTable(schemaTables: SchemaTables) {
  const tableNames = Object.keys(schemaTables);
  const exactMatch = tableNames.find((tableName) => tableName === AUDIT_LOG_TABLE_NAME);
  if (exactMatch) {
    return exactMatch;
  }

  return (
    tableNames.find(
      (tableName) => tableName.toLowerCase() === AUDIT_LOG_TABLE_NAME.toLowerCase(),
    ) ?? null
  );
}

function resolveUserTable(schemaTables: SchemaTables) {
  const tableNames = Object.keys(schemaTables);
  const exactMatch = tableNames.find((tableName) => tableName === "User");
  if (exactMatch) {
    return exactMatch;
  }

  return tableNames.find((tableName) => tableName.toLowerCase() === "user") ?? null;
}

function getTimestampColumnName(columns: string[]) {
  const priority = ["timestamp", "createdAt", "created_at", "loggedAt", "time"];

  for (const candidate of priority) {
    const match = columns.find(
      (columnName) => columnName.toLowerCase() === candidate.toLowerCase(),
    );
    if (match) {
      return match;
    }
  }

  return null;
}

type AuditLogRow = {
  action: string;
  createdAt: string;
  entity: string;
  entityId: string;
  newData: unknown;
  oldData: unknown;
  userId: string | null;
  userName?: string | null;
};

type LogEventRow = {
  action: string;
  createdAtLabel: string;
  createdAtRaw: string;
  entity: string;
  entityId: string;
  summary: string;
  userLabel: string;
  oldData: unknown;
  newData: unknown;
};

function toActionColorClass(action: string) {
  const normalizedAction = action.toUpperCase();

  if (normalizedAction === "CREATE") {
    return "border-emerald-300 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }

  if (normalizedAction === "UPDATE") {
    return "border-amber-300 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }

  if (normalizedAction === "DELETE") {
    return "border-rose-300 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function summarizeChanges(oldData: unknown, newData: unknown) {
  if (oldData == null && newData == null) {
    return "No payload";
  }

  if (oldData == null && newData != null) {
    return "Created new record payload";
  }

  if (oldData != null && newData == null) {
    return "Deleted record payload";
  }

  if (
    typeof oldData === "object" &&
    oldData != null &&
    typeof newData === "object" &&
    newData != null
  ) {
    const oldKeys = Object.keys(oldData as Record<string, unknown>);
    const newKeys = Object.keys(newData as Record<string, unknown>);
    const keyCount = new Set([...oldKeys, ...newKeys]).size;
    return `${keyCount} field${keyCount === 1 ? "" : "s"} in payload`;
  }

  return "Payload changed";
}

function formatJsonBlock(value: unknown) {
  if (value == null) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function LogsView(props: {
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onToggleNavigation: () => void;
  schema: string;
  schemaTables: SchemaTables;
}) {
  const { adapter, isIntrospecting, isNavigationOpen, onToggleNavigation, schema, schemaTables } =
    props;
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [expandedRowIndexes, setExpandedRowIndexes] = useState<number[]>([]);

  const logTableName = useMemo(() => resolveLogTable(schemaTables), [schemaTables]);
  const userTableName = useMemo(() => resolveUserTable(schemaTables), [schemaTables]);
  const logColumns = useMemo(() => {
    if (!logTableName) {
      return [] as string[];
    }

    return Object.keys(schemaTables[logTableName]?.columns ?? {});
  }, [logTableName, schemaTables]);

  useEffect(() => {
    if (!logTableName) {
      setRows([]);
      setErrorMessage(null);
      return;
    }

    const abortController = new AbortController();
    let disposed = false;

    async function loadLogs() {
      setIsLoading(true);
      setErrorMessage(null);

      const timestampColumn = getTimestampColumnName(logColumns);
      const orderBy = timestampColumn ? quoteIdentifier(timestampColumn) : "rowid";
      const safeTableName = logTableName;
      if (!safeTableName) {
        setIsLoading(false);
        return;
      }

      const sql = userTableName
        ? `select logs.action, logs.entity, logs."entityId", logs."oldData", logs."newData", logs."userId", logs."createdAt", users.name as "userName" from ${quoteIdentifier(safeTableName)} logs left join ${quoteIdentifier(userTableName)} users on logs."userId" = users.id order by logs.${orderBy} desc limit 200;`
        : `select action, entity, "entityId", "oldData", "newData", "userId", "createdAt" from ${quoteIdentifier(safeTableName)} order by ${orderBy} desc limit 200;`;

      const [error, result] = await adapter.raw({ sql }, { abortSignal: abortController.signal });

      if (disposed) {
        return;
      }

      setIsLoading(false);

      if (error) {
        setRows([]);
        setErrorMessage(error.message || "Failed to load log rows.");
        return;
      }

      setRows((result?.rows ?? []) as AuditLogRow[]);
      setErrorMessage(null);
    }

    void loadLogs();

    return () => {
      disposed = true;
      abortController.abort();
    };
  }, [adapter, logColumns, logTableName, refreshTick, userTableName]);

  const logEvents = useMemo<LogEventRow[]>(() => {
    return rows.map((row) => {
      const shortEntityId =
        row.entityId.length > 14 ? `${row.entityId.slice(0, 14)}...` : row.entityId;
      return {
        action: row.action,
        createdAtLabel: formatTimestamp(row.createdAt),
        createdAtRaw: row.createdAt,
        entity: row.entity,
        entityId: shortEntityId,
        summary: summarizeChanges(row.oldData, row.newData),
        userLabel: row.userName?.trim() ? row.userName : (row.userId ?? "system"),
        oldData: row.oldData,
        newData: row.newData,
      };
    });
  }, [rows]);

  function toggleRowExpanded(rowIndex: number) {
    setExpandedRowIndexes((current) =>
      current.includes(rowIndex)
        ? current.filter((index) => index !== rowIndex)
        : [...current, rowIndex],
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
        <StudioHeader
          endContent={
            <Button
              aria-label="Refresh logs"
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
          <div className="text-xs text-muted-foreground">
            Logs · schema: <span className="font-mono text-foreground/80">{schema}</span>
            <span className="mx-1 text-foreground/40">·</span>
            table:{" "}
            <span className="font-mono text-foreground/80">{logTableName ?? "not configured"}</span>
          </div>
        </StudioHeader>

        <div className="flex-1 min-h-0 overflow-auto p-3">
          {isIntrospecting && !logTableName ? (
            <div className="rounded-md border border-border/70 p-3">
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ) : !logTableName ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Log table not found in current schema.</p>
              <p className="mt-2 text-xs text-destructive/90">
                Add the model below to your Prisma schema, run a migration (or `prisma db push`),
                and regenerate Prisma Client.
              </p>
              <pre className="mt-3 overflow-auto rounded bg-background/60 p-3 text-[11px] leading-5 text-foreground/90">
                {`model AuditLog {
  id        String   @id @default(cuid())
  action    String   // e.g., "CREATE", "UPDATE", "DELETE"
  entity    String   // e.g., "User", "Post"
  entityId  String
  oldData   Json?    // State before change
  newData   Json?    // State after change
  userId    String?  // The user who performed the action
  createdAt DateTime @default(now())
}`}
              </pre>
            </div>
          ) : errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : isLoading ? (
            <div className="rounded-md border border-border/70 p-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={`logs-skeleton-${index}`} className="mb-2 h-8 w-full last:mb-0" />
              ))}
            </div>
          ) : logEvents.length === 0 ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <p>AuditLog table exists but has no rows.</p>
              <p className="mt-1">
                Add Prisma Client log handlers (`prisma.$on(...)`) and persist events into
                `AuditLog`. See{" "}
                <a
                  href="https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Prisma logging docs
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/70 bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 w-54 whitespace-nowrap text-xs">User</TableHead>
                    <TableHead className="h-9 w-34 whitespace-nowrap text-xs">Action</TableHead>
                    <TableHead className="h-9 w-30 whitespace-nowrap text-xs">Entity</TableHead>
                    <TableHead className="h-9 whitespace-nowrap text-xs">Summary</TableHead>
                    <TableHead className="h-9 w-40 whitespace-nowrap text-xs">Entity ID</TableHead>
                    <TableHead className="h-9 w-56 whitespace-nowrap text-xs">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logEvents.map((event, rowIndex) => {
                    const isExpanded = expandedRowIndexes.includes(rowIndex);

                    return (
                      <Fragment key={`log-row-fragment-${rowIndex}`}>
                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{event.userLabel}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={toActionColorClass(event.action)}>
                              {event.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {event.entity}
                          </TableCell>
                          <TableCell className="text-sm">{event.summary}</TableCell>
                          <TableCell
                            className="font-mono text-xs text-muted-foreground"
                            title={event.entityId}
                          >
                            {event.entityId}
                          </TableCell>
                          <TableCell
                            className="font-mono text-xs text-muted-foreground"
                            title={event.createdAtRaw}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-muted"
                              onClick={() => toggleRowExpanded(rowIndex)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-3" />
                              ) : (
                                <ChevronRight className="size-3" />
                              )}
                              {event.createdAtLabel}
                            </button>
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={6} className="p-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Old Data
                                  </div>
                                  <pre className="max-h-52 overflow-auto rounded border border-border/70 bg-background p-2 font-mono text-[11px] leading-5">
                                    {formatJsonBlock(event.oldData)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    New Data
                                  </div>
                                  <pre className="max-h-52 overflow-auto rounded border border-border/70 bg-background p-2 font-mono text-[11px] leading-5">
                                    {formatJsonBlock(event.newData)}
                                  </pre>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
