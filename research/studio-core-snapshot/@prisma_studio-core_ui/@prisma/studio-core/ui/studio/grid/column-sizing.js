export const DEFAULT_GRID_COLUMN_SIZE = 200;
export const DEFAULT_GRID_COLUMN_MIN_SIZE = 50;
export const DEFAULT_GRID_COLUMN_MAX_SIZE = 400;
function clampGridColumnWidth(width) {
    return Math.min(DEFAULT_GRID_COLUMN_MAX_SIZE, Math.max(DEFAULT_GRID_COLUMN_MIN_SIZE, width));
}
export function clampColumnSizingState(columnSizing) {
    let didChange = false;
    const nextState = {};
    for (const [columnId, width] of Object.entries(columnSizing)) {
        const clampedWidth = clampGridColumnWidth(width);
        nextState[columnId] = clampedWidth;
        didChange ||= clampedWidth !== width;
    }
    return didChange ? nextState : columnSizing;
}
export function resolveColumnSizingStateUpdate(previous, updaterOrValue) {
    const nextState = typeof updaterOrValue === "function"
        ? updaterOrValue(previous)
        : updaterOrValue;
    return clampColumnSizingState(nextState);
}
