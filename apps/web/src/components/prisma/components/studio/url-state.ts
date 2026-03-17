import type { StudioView } from "./types";

export type StudioUrlState = {
  schemaParam: string;
  tableParam: string | null;
  viewParam: StudioView;
};

export const DEFAULT_STUDIO_URL_STATE: StudioUrlState = {
  schemaParam: "main",
  tableParam: "User",
  viewParam: "table",
};

export function parseStudioHash(hash: string): StudioUrlState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const search = raw.startsWith("?") ? raw : `?${raw}`;
  const params = new URLSearchParams(search);
  const viewParam = params.get("view");
  const schemaParam = params.get("schema");
  const tableParam = params.get("table");

  return {
    schemaParam: schemaParam ?? DEFAULT_STUDIO_URL_STATE.schemaParam,
    tableParam,
    viewParam: isStudioView(viewParam)
      ? viewParam
      : DEFAULT_STUDIO_URL_STATE.viewParam,
  };
}

export function createStudioHash(state: StudioUrlState): string {
  const params = new URLSearchParams();
  params.set("view", state.viewParam);
  params.set("schema", state.schemaParam);

  if (state.tableParam) {
    params.set("table", state.tableParam);
  }

  return `#?${params.toString()}`;
}

function isStudioView(value: string | null): value is StudioView {
  return value === "table" || value === "schema" || value === "console" || value === "sql";
}
