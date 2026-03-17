import { useMemo } from "react";

export type NavigationTableItem = {
  id: string;
  schema: string;
  table: string;
};

export function useNavigationTableList(args: {
  schema: string;
  searchTerm: string;
  tableNames: readonly string[];
}) {
  const { schema, searchTerm, tableNames } = args;

  const tables = useMemo<NavigationTableItem[]>(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const filteredTableNames = normalizedSearchTerm
      ? tableNames.filter((tableName) =>
          tableName.toLowerCase().includes(normalizedSearchTerm),
        )
      : tableNames;

    return filteredTableNames.map((tableName) => ({
      id: `${schema}.${tableName}`,
      schema,
      table: tableName,
    }));
  }, [schema, searchTerm, tableNames]);

  return {
    isSearchActive: searchTerm.trim().length > 0,
    tables,
  };
}
