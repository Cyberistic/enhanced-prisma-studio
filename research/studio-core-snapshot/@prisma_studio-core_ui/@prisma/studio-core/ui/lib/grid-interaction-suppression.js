const GRID_INTERACTION_SUPPRESSION_DATASET_KEY = "studioSuppressCellOpenUntil";
const DEFAULT_SUPPRESSION_WINDOW_MS = 250;
export function setGridInteractionSuppressionWindow(durationMs = DEFAULT_SUPPRESSION_WINDOW_MS) {
    if (typeof document === "undefined" || !document.body) {
        return;
    }
    document.body.dataset[GRID_INTERACTION_SUPPRESSION_DATASET_KEY] = String(Date.now() + durationMs);
}
export function isGridInteractionSuppressionActive() {
    if (typeof document === "undefined" || !document.body) {
        return false;
    }
    const suppressUntil = Number(document.body.dataset[GRID_INTERACTION_SUPPRESSION_DATASET_KEY] ?? "0");
    return Number.isFinite(suppressUntil) && suppressUntil > Date.now();
}
