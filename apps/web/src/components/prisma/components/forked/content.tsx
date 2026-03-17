import { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";

import type { StudioEvent, StudioThemeInput } from "../../types";
import type { ForkedStudioView } from "./types";
import { ForkedConsoleView } from "./console-view";
import { ForkedSchemaView } from "./schema-view";
import { ForkedSqlView } from "./sql-view";

type UpstreamStudioProps = Parameters<typeof UpstreamStudio>[0];

export function ForkedStudioContent(props: {
  adapter: UpstreamStudioProps["adapter"];
  aiFilter?: UpstreamStudioProps["aiFilter"];
  onEvent?: (event: StudioEvent) => void;
  onSelectView: (view: ForkedStudioView) => void;
  schema: string;
  selectedView: ForkedStudioView;
  table: string | null;
  theme?: StudioThemeInput;
}) {
  const {
    adapter,
    aiFilter,
    onEvent,
    onSelectView,
    schema,
    selectedView,
    table,
    theme,
  } = props;

  if (selectedView === "schema") {
    return (
      <ForkedSchemaView
        schema={schema}
        table={table}
        onSelectTableView={() => onSelectView("table")}
      />
    );
  }

  if (selectedView === "console") {
    return <ForkedConsoleView schema={schema} table={table} />;
  }

  if (selectedView === "sql") {
    return <ForkedSqlView schema={schema} table={table} />;
  }

  return <UpstreamStudio adapter={adapter} aiFilter={aiFilter} onEvent={onEvent} theme={theme} />;
}