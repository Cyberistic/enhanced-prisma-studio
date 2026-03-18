export const INFINITE_SCROLL_BATCH_SIZE = 25;
export function getNextInfinitePageRowTarget(args) {
  const {
    hasMoreInfiniteRows,
    isInfiniteScrollEnabled,
    loadedInfinitePageCount,
    loadedRowCount,
    pendingRowTarget,
  } = args;
  if (!isInfiniteScrollEnabled || !hasMoreInfiniteRows) {
    return null;
  }
  if (pendingRowTarget != null && loadedRowCount < pendingRowTarget) {
    return null;
  }
  return INFINITE_SCROLL_BATCH_SIZE * (loadedInfinitePageCount + 1);
}
