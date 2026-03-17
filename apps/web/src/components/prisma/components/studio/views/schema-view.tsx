import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { KeyRound } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import { ErrorBoundary } from "../../error-boundary";
import { StudioHeader } from "../studio-header";
import {
  SchemaVisualizer,
  type VisualizerRelationship,
  type VisualizerTable,
} from "./schema-visualizer";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;

type SchemaTables = IntrospectionResult["schemas"][string]["tables"] | null | undefined;

function toVisualizerTables(schemaTables: SchemaTables): VisualizerTable[] {
  const tables = schemaTables ?? {};

  return Object.values(tables).map((tableItem) => ({
    fields: Object.values(tableItem.columns).map((columnItem) => {
      const hasForeignKey = Boolean(columnItem.fkTable && columnItem.fkColumn);
      const isPrimaryKey =
        typeof columnItem.pkPosition === "number" &&
        Number.isFinite(columnItem.pkPosition) &&
        columnItem.pkPosition > 0;

      return {
        foreignKeyTo:
          hasForeignKey && columnItem.fkTable && columnItem.fkColumn
            ? {
                column: columnItem.fkColumn,
                table: columnItem.fkTable,
              }
            : undefined,
        isForeignKey: hasForeignKey,
        isNullable: columnItem.nullable,
        isPrimary: isPrimaryKey,
        name: columnItem.name,
        type: columnItem.datatype.name,
      };
    }),
    name: tableItem.name,
  }));
}

function buildRelationships(schemaTables: SchemaTables): VisualizerRelationship[] {
  const tables = schemaTables ?? {};
  const tableNames = new Set(Object.keys(tables));
  const relationships: VisualizerRelationship[] = [];

  for (const tableItem of Object.values(tables)) {
    for (const columnItem of Object.values(tableItem.columns)) {
      if (!columnItem.fkTable || !columnItem.fkColumn) {
        continue;
      }

      if (!tableNames.has(columnItem.fkTable)) {
        continue;
      }

      relationships.push({
        from: tableItem.name,
        to: columnItem.fkTable,
        type: `${columnItem.name} → ${columnItem.fkColumn}`,
      });
    }
  }

  return relationships;
}

export function SchemaView(props: {
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onSelectTableView: (tableName: string) => void;
  onToggleNavigation: () => void;
  schemaTables: SchemaTables;
  schema: string;
  table: string | null;
}) {
  const {
    isNavigationOpen,
    isIntrospecting,
    onSelectTableView,
    onToggleNavigation,
    schema,
    schemaTables,
    table,
  } = props;

  const tables = useMemo(() => {
    return toVisualizerTables(schemaTables);
  }, [schemaTables]);

  const relationships = useMemo(() => {
    return buildRelationships(schemaTables);
  }, [schemaTables]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <StudioHeader isNavigationOpen={isNavigationOpen} onToggleNavigation={onToggleNavigation}>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground">
              <KeyRound className="size-3 text-primary" />
            </span>
            <span>Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground">
              <span className="inline-flex size-3 items-center justify-center text-center leading-none">
                ?
              </span>
            </span>
            <span>Nullable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary p-0.5 text-primary-foreground">
              <KeyRound className="size-3" />
            </span>
            <span>Foreign Key</span>
          </div>
          <div className="text-xs text-muted-foreground">
            schema: <span className="font-mono text-foreground/80">{schema}</span>
            {table ? (
              <>
                <span className="mx-1 text-foreground/40">/</span>
                <span className="font-mono text-foreground/80">{table}</span>
              </>
            ) : null}
          </div>
        </div>
      </StudioHeader>

      <div className="h-full min-h-0 w-full">
        {isIntrospecting && tables.length === 0 ? (
          <div className="grid h-full min-h-0 w-full grid-cols-3 gap-4 p-4">
            <div className="rounded-md border border-border/70 bg-card p-3">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="mb-2 h-3 w-40" />
              <Skeleton className="mb-2 h-3 w-32" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="rounded-md border border-border/70 bg-card p-3">
              <Skeleton className="mb-3 h-4 w-20" />
              <Skeleton className="mb-2 h-3 w-28" />
              <Skeleton className="mb-2 h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="rounded-md border border-border/70 bg-card p-3">
              <Skeleton className="mb-3 h-4 w-28" />
              <Skeleton className="mb-2 h-3 w-34" />
              <Skeleton className="mb-2 h-3 w-30" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            <SchemaVisualizer
              tables={tables}
              relationships={relationships}
              onOpenTable={(tableName) => onSelectTableView(tableName)}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
