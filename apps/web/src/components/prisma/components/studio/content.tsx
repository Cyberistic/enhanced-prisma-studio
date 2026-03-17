import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import type { SortOrderItem } from "@enhanced-prisma-studio/studio-core/data";

import { IntrospectionStatusNotice } from "./introspection-status-notice";
import type { StudioOperationEvent, StudioView } from "./types";
import { ConsoleView } from "./views/console-view";
import { EvilStatsView } from "./views/evil-stats-view.tsx";
import { LogsView } from "./views/logs-view.tsx";
import { SchemaView } from "./views/schema-view";
import { SqlView } from "./views/sql-view";
import { TableView } from "./views/table-view";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;

export function StudioContent(props: {
  activeTable?: IntrospectionResult["schemas"][string]["tables"][string] | null;
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting?: boolean;
  operationEvents: StudioOperationEvent[];
  onPinnedColumnsChange: (columnNames: string[]) => void;
  onOperationEvent: (event: StudioOperationEvent) => void;
  onSortOrderChange: (sortOrder: SortOrderItem[]) => void;
  onToggleNavigation: () => void;
  pinnedColumns: string[];
  sortOrder: SortOrderItem[];
  onSelectTable: (tableName: string) => void;
  onSelectView: (view: StudioView) => void;
  schemaTables?: IntrospectionResult["schemas"][string]["tables"];
  schema: string;
  selectedView: StudioView;
  table: string | null;
  startupIntrospectionError?: {
    message: string;
    queryPreview: string | null;
    source: string;
  } | null;
  onRetryIntrospection?: () => void;
}) {
  const {
    activeTable = null,
    adapter,
    isNavigationOpen,
    isIntrospecting = false,
    operationEvents,
    onOperationEvent,
    onPinnedColumnsChange,
    onSortOrderChange,
    onSelectTable,
    onSelectView,
    onToggleNavigation,
    pinnedColumns,
    sortOrder,
    schemaTables = {},
    schema,
    selectedView,
    table,
    startupIntrospectionError = null,
    onRetryIntrospection = () => {},
  } = props;

  function handleSelectTableView(tableName: string) {
    onSelectTable(tableName);
    onSelectView("table");
  }

  if (startupIntrospectionError) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex flex-1 items-center justify-center p-6">
          <IntrospectionStatusNotice
            className="w-full max-w-2xl"
            description="Studio could not introspect the database."
            isRetrying={isIntrospecting}
            message={startupIntrospectionError.message}
            onRetry={onRetryIntrospection}
            queryPreview={startupIntrospectionError.queryPreview}
            source={startupIntrospectionError.source}
            title="Introspection failed"
            variant="error"
          />
        </div>
      </div>
    );
  }

  if (selectedView === "schema") {
    return (
      <SchemaView
        isNavigationOpen={isNavigationOpen}
        isIntrospecting={isIntrospecting}
        onSelectTableView={handleSelectTableView}
        onToggleNavigation={onToggleNavigation}
        schemaTables={schemaTables}
        schema={schema}
        table={table}
      />
    );
  }

  if (selectedView === "console") {
    return (
      <ConsoleView
        isNavigationOpen={isNavigationOpen}
        isIntrospecting={isIntrospecting}
        operationEvents={operationEvents}
        onToggleNavigation={onToggleNavigation}
        schema={schema}
        table={table}
      />
    );
  }

  if (selectedView === "sql") {
    return (
      <SqlView
        adapter={adapter}
        isNavigationOpen={isNavigationOpen}
        isIntrospecting={isIntrospecting}
        onOperationEvent={onOperationEvent}
        onToggleNavigation={onToggleNavigation}
        schema={schema}
        table={table}
      />
    );
  }

  if (selectedView === "logs") {
    return (
      <LogsView
        adapter={adapter}
        isNavigationOpen={isNavigationOpen}
        isIntrospecting={isIntrospecting}
        onToggleNavigation={onToggleNavigation}
        schema={schema}
        schemaTables={schemaTables}
      />
    );
  }

  if (selectedView === "evil-stats") {
    return (
      <EvilStatsView
        adapter={adapter}
        isNavigationOpen={isNavigationOpen}
        isIntrospecting={isIntrospecting}
        onToggleNavigation={onToggleNavigation}
        schemaTables={schemaTables}
        schema={schema}
        table={table}
      />
    );
  }

  return (
    <TableView
      activeTable={activeTable}
      adapter={adapter}
      isNavigationOpen={isNavigationOpen}
      isIntrospecting={isIntrospecting}
      onPinnedColumnsChange={onPinnedColumnsChange}
      onToggleNavigation={onToggleNavigation}
      pinnedColumns={pinnedColumns}
      sortOrder={sortOrder}
      onSortOrderChange={onSortOrderChange}
      schema={schema}
      table={table}
    />
  );
}
