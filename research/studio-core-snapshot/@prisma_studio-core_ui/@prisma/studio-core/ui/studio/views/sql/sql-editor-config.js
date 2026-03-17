import { MySQL, PostgreSQL, SQLite, } from "@codemirror/lang-sql";
export function getCodeMirrorDialect(dialect) {
    if (dialect === "mysql") {
        return MySQL;
    }
    if (dialect === "sqlite") {
        return SQLite;
    }
    return PostgreSQL;
}
export function toCodeMirrorSqlNamespace(namespace) {
    const schemas = {};
    const sortedSchemaNames = Object.keys(namespace).sort((left, right) => left.localeCompare(right));
    for (const schemaName of sortedSchemaNames) {
        const tables = namespace[schemaName] ?? {};
        const normalizedTables = {};
        const sortedTableNames = Object.keys(tables).sort((left, right) => left.localeCompare(right));
        for (const tableName of sortedTableNames) {
            normalizedTables[tableName] = [...(tables[tableName] ?? [])].sort((left, right) => left.localeCompare(right));
        }
        schemas[schemaName] = normalizedTables;
    }
    return schemas;
}
