import type { ForkedStudioView } from "./types";

export type ForkedStudioUrlState = {
  schemaParam: string;
  tableParam: string | null;
  viewParam: ForkedStudioView;
};

export const DEFAULT_FORKED_URL_STATE: ForkedStudioUrlState = {
  schemaParam: "main",
  tableParam: "User",
  viewParam: "table",
};

export function parseForkedStudioHash(hash: string): ForkedStudioUrlState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const search = raw.startsWith("?") ? raw : `?${raw}`;
  const params = new URLSearchParams(search);
  const viewParam = params.get("view");
  const schemaParam = params.get("schema");
  const tableParam = params.get("table");

  return {
    schemaParam: schemaParam ?? DEFAULT_FORKED_URL_STATE.schemaParam,
    tableParam,
    viewParam: isForkedStudioView(viewParam)
      ? viewParam
      : DEFAULT_FORKED_URL_STATE.viewParam,
  };
}

export function createForkedStudioHash(state: ForkedStudioUrlState): string {
  const params = new URLSearchParams();
  params.set("view", state.viewParam);
  params.set("schema", state.schemaParam);

  if (state.tableParam) {
    params.set("table", state.tableParam);
  }

  return `#?${params.toString()}`;
}

function isForkedStudioView(value: string | null): value is ForkedStudioView {
  return value === "table" || value === "schema" || value === "console" || value === "sql";
}
