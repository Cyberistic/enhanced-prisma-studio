import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";

import type { StudioView } from "./types";
import { ConsoleView } from "./views/console-view";
import { SchemaView } from "./views/schema-view";
import { SqlView } from "./views/sql-view";
import { TableView } from "./views/table-view";

export function StudioContent(props: {
  adapter: Adapter;
  onSelectView: (view: StudioView) => void;
  schema: string;
  selectedView: StudioView;
  table: string | null;
}) {
  const { adapter, onSelectView, schema, selectedView, table } = props;

  if (selectedView === "schema") {
    return (
      <SchemaView
        schema={schema}
        table={table}
        onSelectTableView={() => onSelectView("table")}
      />
    );
  }

  if (selectedView === "console") {
    return <ConsoleView schema={schema} table={table} />;
  }

  if (selectedView === "sql") {
    return <SqlView schema={schema} table={table} />;
  }

  return <TableView adapter={adapter} schema={schema} table={table} />;
}
