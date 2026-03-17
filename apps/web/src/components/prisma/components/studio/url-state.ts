import type { SortOrderItem } from "@enhanced-prisma-studio/studio-core/data";

import type { StudioView } from "./types";

export type StudioUrlState = {
  pinnedColumnsParam: string[];
  schemaParam: string;
  sortOrderParam: SortOrderItem[];
  tableParam: string | null;
  viewParam: StudioView;
};

export const DEFAULT_STUDIO_URL_STATE: StudioUrlState = {
  pinnedColumnsParam: [],
  schemaParam: "main",
  sortOrderParam: [],
  tableParam: null,
  viewParam: "table",
};

export function parseStudioHash(hash: string): StudioUrlState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const search = raw.startsWith("?") ? raw : `?${raw}`;
  const params = new URLSearchParams(search);
  const viewParam = params.get("view");
  const schemaParam = params.get("schema");
  const tableParam = params.get("table");
  const sortOrderParam = params
    .get("sort")
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => {
      const [column, direction] = value.split(":");
      const normalizedDirection = direction === "desc" ? "desc" : direction === "asc" ? "asc" : null;

      if (!column || !normalizedDirection) {
        return null;
      }

      return {
        column,
        direction: normalizedDirection,
      } satisfies SortOrderItem;
    })
    .filter((value): value is SortOrderItem => value != null) ?? [];
  const pinnedColumnsParam = params
    .get("pin")
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0) ?? [];

  return {
    pinnedColumnsParam,
    schemaParam: schemaParam ?? DEFAULT_STUDIO_URL_STATE.schemaParam,
    sortOrderParam,
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

  if (state.pinnedColumnsParam.length > 0) {
    params.set("pin", state.pinnedColumnsParam.join(","));
  }

  if (state.sortOrderParam.length > 0) {
    params.set(
      "sort",
      state.sortOrderParam
        .map((item) => `${item.column}:${item.direction}`)
        .join(","),
    );
  }

  if (state.tableParam) {
    params.set("table", state.tableParam);
  }

  return `#?${params.toString()}`;
}

function isStudioView(value: string | null): value is StudioView {
  return value === "table" || value === "schema" || value === "console" || value === "sql";
}
