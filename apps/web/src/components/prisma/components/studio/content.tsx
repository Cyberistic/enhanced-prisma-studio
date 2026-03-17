import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { useCallback, useState } from "react";

import type { StudioOperationEvent, StudioView } from "./types";
import { ConsoleView } from "./views/console-view";
import { SchemaView } from "./views/schema-view";
import { SqlView } from "./views/sql-view";
import { TableView } from "./views/table-view";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;

export function StudioContent(props: {
  activeTable?: IntrospectionResult["schemas"][string]["tables"][string] | null;
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting?: boolean;
  onPinnedColumnsChange: (columnNames: string[]) => void;
  onToggleNavigation: () => void;
  pinnedColumns: string[];
  onSelectTable: (tableName: string) => void;
  onSelectView: (view: StudioView) => void;
  schemaTables?: IntrospectionResult["schemas"][string]["tables"];
  schema: string;
  selectedView: StudioView;
  table: string | null;
}) {
  const {
    activeTable = null,
    adapter,
    isNavigationOpen,
    isIntrospecting = false,
    onPinnedColumnsChange,
    onSelectTable,
    onSelectView,
    onToggleNavigation,
    pinnedColumns,
    schemaTables = {},
    schema,
    selectedView,
    table,
  } = props;
  const [operationEvents, setOperationEvents] = useState<StudioOperationEvent[]>([]);

  const handleOperationEvent = useCallback((event: StudioOperationEvent) => {
    setOperationEvents((currentEvents) => [...currentEvents, event]);
  }, []);

  function handleSelectTableView(tableName: string) {
    onSelectTable(tableName);
    onSelectView("table");
  }

  if (selectedView === "schema") {
    return (
      <SchemaView
        isNavigationOpen={isNavigationOpen}
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
        onOperationEvent={handleOperationEvent}
        onToggleNavigation={onToggleNavigation}
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
      schema={schema}
      table={table}
    />
  );
}
