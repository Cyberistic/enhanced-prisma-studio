import { normalizeSelectionRange } from "./cell-selection";
export const GRID_SELECTION_MACHINE_INITIAL_STATE = {
  mode: "none",
};
function assertNever(value) {
  throw new Error(`Unhandled selection event: ${JSON.stringify(value)}`);
}
function normalizeRowIds(rowIds) {
  return Array.from(
    new Set(
      rowIds
        .filter((rowId) => typeof rowId === "string")
        .map((rowId) => rowId.trim())
        .filter((rowId) => rowId.length > 0),
    ),
  );
}
function cloneCoordinate(coordinate) {
  return {
    rowIndex: coordinate.rowIndex,
    columnId: coordinate.columnId,
    columnIndex: coordinate.columnIndex,
  };
}
function cloneState(state) {
  if (state.mode === "none") {
    return GRID_SELECTION_MACHINE_INITIAL_STATE;
  }
  if (state.mode === "row") {
    return {
      mode: "row",
      rowIds: [...state.rowIds],
    };
  }
  return {
    mode: "cell",
    start: cloneCoordinate(state.start),
    end: cloneCoordinate(state.end),
  };
}
export function transitionGridSelectionMachine(state, event) {
  switch (event.type) {
    case "cell.select":
      return {
        mode: "cell",
        start: cloneCoordinate(event.start),
        end: cloneCoordinate(event.end),
      };
    case "cell.clear":
      return state.mode === "cell" ? GRID_SELECTION_MACHINE_INITIAL_STATE : cloneState(state);
    case "row.select": {
      const rowIds = normalizeRowIds(event.rowIds);
      if (rowIds.length === 0) {
        return GRID_SELECTION_MACHINE_INITIAL_STATE;
      }
      return {
        mode: "row",
        rowIds,
      };
    }
    case "row.clear":
      return state.mode === "row" ? GRID_SELECTION_MACHINE_INITIAL_STATE : cloneState(state);
    case "escape":
    case "reset":
      return GRID_SELECTION_MACHINE_INITIAL_STATE;
    default:
      return assertNever(event);
  }
}
export function getCellSelectionRange(state) {
  if (state.mode !== "cell") {
    return null;
  }
  return normalizeSelectionRange({
    start: state.start,
    end: state.end,
  });
}
export function getCellSelectionAnchor(state) {
  return state.mode === "cell" ? state.start : null;
}
export function getCellSelectionFocus(state) {
  return state.mode === "cell" ? state.end : null;
}
export function getSelectedRowIds(state) {
  return state.mode === "row" ? state.rowIds : [];
}
export function hasRowSelectionMode(state) {
  return state.mode === "row" && state.rowIds.length > 0;
}
export function hasAnySelection(state) {
  return state.mode !== "none";
}
export function rowSelectionStateToIds(rowSelectionState) {
  return Object.entries(rowSelectionState)
    .filter(([, isSelected]) => isSelected === true)
    .map(([rowId]) => rowId)
    .sort();
}
export function rowIdsToRowSelectionState(rowIds) {
  const nextSelection = {};
  for (const rowId of normalizeRowIds(rowIds)) {
    nextSelection[rowId] = true;
  }
  return nextSelection;
}
