import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, useLiveQuery } from "@tanstack/react-db";
import { useIsFetching } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useStudio } from "../studio/context";
import { useNavigation } from "./use-navigation";
import { addRowIdToResult } from "./utils/add-row-id-to-result";
function writeUpdatedRows(args) {
  const { activeTable, rows, writeUpdate } = args;
  for (const row of rows) {
    writeUpdate(addRowIdToResult({ row }, activeTable).row);
  }
}
function compareRowsByQueryOrder(left, right) {
  const leftOrder = typeof left.__ps_order === "number" ? left.__ps_order : Infinity;
  const rightOrder = typeof right.__ps_order === "number" ? right.__ps_order : Infinity;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  const leftRowId = String(left.__ps_rowid ?? "");
  const rightRowId = String(right.__ps_rowid ?? "");
  return leftRowId.localeCompare(rightRowId);
}
function getSortKey(sortOrder) {
  return sortOrder.map((item) => `${item.column}:${item.direction}`).join(",");
}
function getFilterKey(filter) {
  return JSON.stringify(filter);
}
function getQueryScopeKey(table, query) {
  if (!table) {
    return "";
  }
  const { filter, fullTableSearchTerm, pageIndex, pageSize, sortOrder } = query;
  return [
    table.schema,
    table.name,
    String(pageIndex),
    String(pageSize),
    getSortKey(sortOrder),
    getFilterKey(filter),
    fullTableSearchTerm ?? "",
  ].join("::");
}
function getFilteredRowCountKey(table, query) {
  if (!table) {
    return "";
  }
  return [
    table.schema,
    table.name,
    getFilterKey(query.filter),
    query.fullTableSearchTerm ?? "",
  ].join("::");
}
function upsertFilteredRowCount(id, filteredRowCount, tableQueryMetaCollection) {
  const existing = tableQueryMetaCollection.get(id);
  if (!existing) {
    tableQueryMetaCollection.insert({
      id,
      filteredRowCount,
    });
    return;
  }
  if (existing.filteredRowCount === filteredRowCount) {
    return;
  }
  tableQueryMetaCollection.update(id, (draft) => {
    draft.filteredRowCount = filteredRowCount;
  });
}
export function useActiveTableRowsCollection(query) {
  const { filter, fullTableSearchTerm, pageIndex, pageSize, sortOrder } = query;
  const studio = useStudio();
  const { adapter, onEvent, queryClient, tableQueryMetaCollection } = studio;
  const {
    metadata: { activeTable },
  } = useNavigation();
  const sortKey = useMemo(() => getSortKey(sortOrder), [sortOrder]);
  const filterKey = useMemo(
    () => `${getFilterKey(filter)}::${fullTableSearchTerm ?? ""}`,
    [filter, fullTableSearchTerm],
  );
  const queryScopeKey = useMemo(
    () =>
      getQueryScopeKey(activeTable, {
        fullTableSearchTerm,
        pageIndex,
        pageSize,
        sortOrder,
        filter,
      }),
    [activeTable, filter, fullTableSearchTerm, pageIndex, pageSize, sortOrder],
  );
  const filteredRowCountKey = useMemo(
    () =>
      getFilteredRowCountKey(activeTable, {
        filter,
        fullTableSearchTerm,
      }),
    [activeTable, filter, fullTableSearchTerm],
  );
  const queryKey = useMemo(
    () =>
      activeTable
        ? [
            "schema",
            activeTable.schema,
            "table",
            activeTable.name,
            "query",
            "sortOrder",
            sortKey || "natural",
            "pageIndex",
            pageIndex,
            "pageSize",
            pageSize,
            "filter",
            filterKey,
          ]
        : null,
    [activeTable, filterKey, pageIndex, pageSize, sortKey],
  );
  const collection = useMemo(() => {
    if (!activeTable || !queryScopeKey) {
      return null;
    }
    return studio.getOrCreateRowsCollection(queryScopeKey, () => {
      return createCollection(
        queryCollectionOptions({
          compare: compareRowsByQueryOrder,
          gcTime: 0,
          id: `rows:${queryScopeKey}`,
          getKey(item) {
            return String(item.__ps_rowid);
          },
          onDelete: async ({ transaction }) => {
            const rows = transaction.mutations.map((mutation) => mutation.original);
            if (rows.length === 0) {
              return;
            }
            const [error, result] = await adapter.delete({ rows, table: activeTable }, {});
            if (error) {
              onEvent({
                name: "studio_operation_error",
                payload: {
                  operation: "delete",
                  query: error.query,
                  error,
                },
              });
              throw error;
            }
            onEvent({
              name: "studio_operation_success",
              payload: {
                operation: "delete",
                query: result.query,
                error: undefined,
              },
            });
          },
          onUpdate: async ({ collection, transaction }) => {
            if (transaction.mutations.length > 1 && typeof adapter.updateMany === "function") {
              const [error, result] = await adapter.updateMany(
                {
                  table: activeTable,
                  updates: transaction.mutations.map((mutation) => ({
                    changes: mutation.changes,
                    row: mutation.original,
                    table: activeTable,
                  })),
                },
                {},
              );
              if (error) {
                onEvent({
                  name: "studio_operation_error",
                  payload: {
                    operation: "update",
                    query: error.query,
                    error,
                  },
                });
                throw error;
              }
              for (const query of result.queries) {
                onEvent({
                  name: "studio_operation_success",
                  payload: {
                    operation: "update",
                    query,
                    error: undefined,
                  },
                });
              }
              writeUpdatedRows({
                activeTable,
                writeUpdate: collection.utils.writeUpdate,
                rows: result.rows,
              });
              return;
            }
            for (const mutation of transaction.mutations) {
              const [error, result] = await adapter.update(
                {
                  changes: mutation.changes,
                  row: mutation.original,
                  table: activeTable,
                },
                {},
              );
              if (error) {
                onEvent({
                  name: "studio_operation_error",
                  payload: {
                    operation: "update",
                    query: error.query,
                    error,
                  },
                });
                throw error;
              }
              onEvent({
                name: "studio_operation_success",
                payload: {
                  operation: "update",
                  query: result.query,
                  error: undefined,
                },
              });
              writeUpdatedRows({
                activeTable,
                writeUpdate: collection.utils.writeUpdate,
                rows: [result.row],
              });
            }
          },
          queryClient,
          queryFn: async ({ signal }) => {
            const [error, result] = await adapter.query(
              {
                pageIndex,
                pageSize,
                sortOrder,
                table: activeTable,
                filter,
                fullTableSearchTerm,
              },
              { abortSignal: signal },
            );
            if (error) {
              onEvent({
                name: "studio_operation_error",
                payload: {
                  operation: "query",
                  query: error.query,
                  error,
                },
              });
              throw error;
            }
            onEvent({
              name: "studio_operation_success",
              payload: {
                operation: "query",
                query: result.query,
                error: undefined,
              },
            });
            upsertFilteredRowCount(
              filteredRowCountKey,
              result.filteredRowCount,
              tableQueryMetaCollection,
            );
            return addRowIdToResult(result, activeTable).rows;
          },
          queryKey: () => [
            "schema",
            activeTable.schema,
            "table",
            activeTable.name,
            "query",
            "sortOrder",
            sortKey || "natural",
            "pageIndex",
            pageIndex,
            "pageSize",
            pageSize,
            "filter",
            filterKey,
          ],
          retry: false,
          staleTime: Infinity,
        }),
      );
    });
  }, [
    activeTable,
    adapter,
    filter,
    filterKey,
    fullTableSearchTerm,
    onEvent,
    pageIndex,
    pageSize,
    queryClient,
    filteredRowCountKey,
    queryScopeKey,
    sortKey,
    sortOrder,
    studio,
    tableQueryMetaCollection,
  ]);
  const { data: rows = [], isLoading } = useLiveQuery(
    (q) => {
      if (!collection) {
        return undefined;
      }
      return q
        .from({ row: collection })
        .orderBy(({ row }) => row.__ps_order, {
          direction: "asc",
          nulls: "last",
        })
        .orderBy(({ row }) => row.__ps_rowid)
        .fn.select((currentRow) => currentRow.row);
    },
    [collection],
  );
  const isQueryFetching = useIsFetching(
    queryKey ? { queryKey, exact: true } : undefined,
    queryClient,
  );
  const filteredRowCount =
    tableQueryMetaCollection.get(filteredRowCountKey)?.filteredRowCount ?? Infinity;
  const refetch = useCallback(async () => {
    if (!collection) {
      return;
    }
    await collection.utils.refetch({ throwOnError: true });
  }, [collection]);
  return {
    activeTable,
    collection,
    rows,
    filteredRowCount,
    isFetching: isLoading || isQueryFetching > 0,
    refetch,
    queryScopeKey,
  };
}
