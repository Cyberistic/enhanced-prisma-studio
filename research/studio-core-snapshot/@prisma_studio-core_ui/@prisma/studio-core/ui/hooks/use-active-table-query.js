import { useActiveTableRowsCollection } from "./use-active-table-rows-collection";
import { useNavigation } from "./use-navigation";
export function useActiveTableQuery(props) {
  const { filter, pageIndex, pageSize, sortOrder } = props;
  const {
    metadata: { activeTable },
  } = useNavigation();
  const fullTableSearchTerm = resolveFullTableSearchTerm({
    activeTable,
    searchScope: props.searchScope ?? "table",
    searchTerm: props.searchTerm ?? "",
  });
  const state = useActiveTableRowsCollection({
    filter,
    fullTableSearchTerm,
    pageIndex,
    pageSize,
    sortOrder,
  });
  return {
    data: state.activeTable
      ? {
          filteredRowCount: state.filteredRowCount,
          rows: state.rows,
        }
      : undefined,
    isFetching: state.isFetching,
    refetch: state.refetch,
  };
}
export function resolveFullTableSearchTerm(args) {
  const { activeTable, searchScope } = args;
  const searchTerm = args.searchTerm.trim();
  if (searchScope !== "row" || searchTerm.length === 0 || activeTable == null) {
    return undefined;
  }
  return searchTerm;
}
