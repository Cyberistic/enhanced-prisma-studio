import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { KeyRound } from "lucide-react";
import { Component, type ErrorInfo, useMemo } from "react";

import { StudioHeader } from "../studio-header";
import {
  SchemaVisualizer,
  type VisualizerRelationship,
  type VisualizerTable,
} from "./schema-visualizer";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;

type SchemaTables = IntrospectionResult["schemas"][string]["tables"] | null | undefined;

type VisualizerBoundaryState = {
  hasError: boolean;
};

class VisualizerBoundary extends Component<{ children: React.ReactNode }, VisualizerBoundaryState> {
  state: VisualizerBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Schema visualizer failed to render", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-0 w-full items-center justify-center border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Schema visualizer failed to render. Try refreshing introspection or selecting another table.
        </div>
      );
    }

    return this.props.children;
  }
}

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
  onSelectTableView: (tableName: string) => void;
  onToggleNavigation: () => void;
  schemaTables: SchemaTables;
  schema: string;
  table: string | null;
}) {
  const {
    isNavigationOpen,
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
        <VisualizerBoundary>
          <SchemaVisualizer
            tables={tables}
            relationships={relationships}
            onOpenTable={(tableName) => onSelectTableView(tableName)}
          />
        </VisualizerBoundary>
      </div>
    </div>
  );
}
