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
    const { schema, searchTerm, tableNames = [] } = args;

    const tables = useMemo<NavigationTableItem[]>(() => {
        const normalizedSearchTerm = searchTerm.trim().toLowerCase();
        const safeTableNames = Array.isArray(tableNames) ? tableNames : [];

        const filteredTableNames = normalizedSearchTerm
            ? safeTableNames.filter((tableName) =>
                tableName.toLowerCase().includes(normalizedSearchTerm),
            )
            : safeTableNames;

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
