import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  countFiltersRecursive,
  createAppliedFilterFromEditing,
  createEditingFilterFromApplied,
  defaultFilter,
  mergeEditingFilterUiMetadata,
} from "./filter-utils";
import { useNavigation } from "./use-navigation";
import { useTableUiState } from "./use-table-ui-state";
function parseAppliedFilter(filterParam) {
  try {
    return JSON.parse(filterParam);
  } catch (error) {
    console.error("Failed to parse filter param", error);
    return defaultFilter;
  }
}
export function useFiltering(columns) {
  const { filterParam, setFilterParam } = useNavigation();
  const appliedFilter = useMemo(() => parseAppliedFilter(filterParam), [filterParam]);
  const appliedFilterSerialized = useMemo(() => JSON.stringify(appliedFilter), [appliedFilter]);
  const editingFilterDefaults = useMemo(
    () => createEditingFilterFromApplied(appliedFilter),
    [appliedFilter],
  );
  const setAppliedFilter = useCallback(
    (filter) => void setFilterParam(JSON.stringify(filter)),
    [setFilterParam],
  );
  const { scopeKey, tableUiState, updateTableUiState } = useTableUiState({
    editingFilter: editingFilterDefaults,
  });
  const editingFilter = tableUiState?.editingFilter ?? editingFilterDefaults;
  const currentFilterSyncKey = `${scopeKey}:${appliedFilterSerialized}`;
  const previousFilterSyncKey = useRef(currentFilterSyncKey);
  const setEditingFilter = useCallback(
    (filter) => {
      updateTableUiState((draft) => {
        draft.editingFilter = filter;
      });
    },
    [updateTableUiState],
  );
  const applyEditingFilter = useCallback(
    (filter = editingFilter) => {
      setAppliedFilter(createAppliedFilterFromEditing(filter, columns));
    },
    [columns, editingFilter, setAppliedFilter],
  );
  // Keep table editing state synchronized with the currently applied URL filter.
  useEffect(() => {
    if (previousFilterSyncKey.current === currentFilterSyncKey) {
      return;
    }
    previousFilterSyncKey.current = currentFilterSyncKey;
    setEditingFilter(
      mergeEditingFilterUiMetadata({
        currentFilter: editingFilterDefaults,
        previousFilter: editingFilter,
      }),
    );
  }, [currentFilterSyncKey, editingFilter, editingFilterDefaults, setEditingFilter]);
  const totalEditingFilters = useMemo(() => countFiltersRecursive(editingFilter), [editingFilter]);
  return {
    appliedFilter,
    setAppliedFilter,
    editingFilter,
    setEditingFilter,
    applyEditingFilter,
    totalEditingFilters,
  };
}
