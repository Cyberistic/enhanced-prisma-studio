import { createAdapterError } from "../adapter";
import {
  createFullTableSearchExecutionState,
  executeQueryWithFullTableSearchGuardrails,
} from "../full-table-search";
import { asQuery } from "../query";
import { createSqlEditorSchemaFromIntrospection } from "../sql-editor-schema";
import { determineColumnAffinity, SQLITE_AFFINITY_TO_METADATA } from "./datatype";
import { getDeleteQuery, getInsertQuery, getSelectQuery, getUpdateQuery } from "./dml";
import { getTablesQuery, mockTablesQuery } from "./introspection";
import { lintSQLiteWithExplainFallback } from "./sql-lint";
const schema = "main";
const filterOperators = ["=", "!=", ">", ">=", "<", "<=", "is", "is not", "like", "not like"];
export function createSQLiteAdapter(requirements) {
  const { executor, ...otherRequirements } = requirements;
  const fullTableSearchState = createFullTableSearchExecutionState();
  let canUseExecutorLintTransport = typeof executor.lintSql === "function";
  const createSQLiteAdapterError = (args) =>
    createAdapterError({ ...args, adapterSource: "sqlite" });
  async function executeUpdateTransaction(updates, options) {
    const queries = updates.map((update) => getUpdateQuery(update, otherRequirements));
    try {
      if (typeof executor.executeTransaction === "function") {
        const [error, results] = await executor.executeTransaction(queries, options);
        if (error) {
          return createSQLiteAdapterError({ error, query: queries[0] });
        }
        const rows = [];
        for (const [index, result] of results.entries()) {
          const [row] = result;
          if (!row) {
            return createSQLiteAdapterError({
              error: new Error("Update failed"),
              query: queries[index],
            });
          }
          rows.push(row);
        }
        return [null, { rows, queries }];
      }
      const rows = [];
      for (const [index, query] of queries.entries()) {
        const [error, results] = await executor.execute(query, options);
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        const [row] = results;
        if (!row) {
          return createSQLiteAdapterError({
            error: new Error("Update failed"),
            query: queries[index],
          });
        }
        rows.push(row);
      }
      return [null, { rows, queries }];
    } catch (error) {
      return createSQLiteAdapterError({ error: error });
    }
  }
  async function introspectDatabase(options) {
    try {
      const tablesQuery = getTablesQuery(requirements);
      const [tablesError, tables] = await executor.execute(tablesQuery, options);
      if (tablesError) {
        return createSQLiteAdapterError({
          error: tablesError,
          query: tablesQuery,
        });
      }
      return [null, createIntrospection({ query: tablesQuery, tables })];
    } catch (error) {
      return createSQLiteAdapterError({ error: error });
    }
  }
  return {
    defaultSchema: schema,
    capabilities: {
      fullTableSearch: true,
      sqlDialect: "sqlite",
      sqlEditorAutocomplete: true,
      sqlEditorLint: true,
    },
    async delete(details, options) {
      try {
        const query = getDeleteQuery(details, otherRequirements);
        // TODO: use results too.
        const [error] = await executor.execute(query, options);
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        return [null, { ...details, query }];
      } catch (error) {
        return createSQLiteAdapterError({ error: error });
      }
    },
    async insert(details, options) {
      try {
        const query = getInsertQuery(details, otherRequirements);
        const [error, rows] = await executor.execute(query, options);
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        return [null, { rows, query }];
      } catch (error) {
        return createSQLiteAdapterError({ error: error });
      }
    },
    async introspect(options) {
      return await introspectDatabase(options);
    },
    async sqlSchema(_details, options) {
      const [error, introspection] = await introspectDatabase(options);
      if (error) {
        return [error];
      }
      return [
        null,
        createSqlEditorSchemaFromIntrospection({
          defaultSchema: schema,
          dialect: "sqlite",
          introspection,
        }),
      ];
    },
    async sqlLint(details, options) {
      if (canUseExecutorLintTransport && typeof executor.lintSql === "function") {
        try {
          const [error, result] = await executor.lintSql(details, options);
          if (!error) {
            return [null, result];
          }
          if (!shouldFallbackToExplainLint(error)) {
            return createSQLiteAdapterError({ error });
          }
          canUseExecutorLintTransport = false;
        } catch (error) {
          if (!shouldFallbackToExplainLint(error)) {
            return createSQLiteAdapterError({ error: error });
          }
          canUseExecutorLintTransport = false;
        }
      }
      return await lintSQLiteWithExplainFallback(executor, details, options);
    },
    async query(details, options) {
      try {
        const query = getSelectQuery(details, otherRequirements);
        const [error, results] = await executeQueryWithFullTableSearchGuardrails({
          executor,
          options,
          query,
          searchTerm: details.fullTableSearchTerm,
          state: fullTableSearchState,
        });
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        return [
          null,
          {
            filteredRowCount: results[0]?.__ps_count__ || "0",
            rows: results,
            query,
          },
        ];
      } catch (error) {
        // TODO: handle properly
        return createSQLiteAdapterError({ error: error });
      }
    },
    async raw(details, options) {
      try {
        const query = asQuery(details.sql);
        const [error, rows] = await executor.execute(query, options);
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        return [
          null,
          {
            query,
            rowCount: rows.length,
            rows: rows,
          },
        ];
      } catch (error) {
        return createSQLiteAdapterError({ error: error });
      }
    },
    async update(details, options) {
      try {
        const query = getUpdateQuery(details, otherRequirements);
        const [error, results] = await executor.execute(query, options);
        if (error) {
          return createSQLiteAdapterError({ error, query });
        }
        const [row] = results;
        if (!row) {
          // TODO: custom error?
          return createSQLiteAdapterError({
            error: new Error("Update failed"),
            query,
          });
        }
        return [null, { row, query }];
      } catch (error) {
        return createSQLiteAdapterError({ error: error });
      }
    },
    async updateMany(details, options) {
      return await executeUpdateTransaction(details.updates, options);
    },
  };
}
function shouldFallbackToExplainLint(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid procedure") ||
    message.includes("not supported") ||
    message.includes("method not allowed")
  );
}
const WITHOUT_ROWID_REGEX = /WITHOUT\s+ROWID/i;
function createIntrospection(args) {
  const { tables, query: tablesQuery } = args;
  return {
    filterOperators,
    query: tablesQuery,
    schemas: tables.reduce(
      (schemas, table) => {
        const { columns, name: tableName, sql } = table;
        let maxPKSeen = 0;
        const columnsRecord = columns.reduce((columnsRecord, column, index) => {
          const { datatype, default: defaultValue, fk_column, name: columnName, pk } = column;
          maxPKSeen = Math.max(maxPKSeen, pk);
          const affinity = determineColumnAffinity(datatype);
          /**
           * `INTEGER PRIMARY KEY` columns act as `rowid` alias. `rowid` columns
           * are auto-generated unique numbers that exist in every SQLite table
           * unless a table is created using `WITHOUT ROWID` option.
           */
          const isRowId =
            datatype.toUpperCase() === "INTEGER" &&
            pk === 1 &&
            // no other primary key columns before this column.
            maxPKSeen === 1 &&
            !columns.slice(index + 1).some(function isAlsoInPrimaryKey(column) {
              return column.pk > 1;
            }) &&
            !WITHOUT_ROWID_REGEX.test(sql);
          const isComputed = Boolean(column.computed);
          // `rowid` columns are implicitly not nullable.
          const nullable = Boolean(column.nullable) && !isRowId;
          columnsRecord[columnName] = {
            datatype: {
              ...SQLITE_AFFINITY_TO_METADATA[affinity],
              affinity,
              isArray: false,
              isNative: true,
              name: datatype,
              // TODO: use `table.sql` to determine enum options from `check` constraints.
              options: [],
              schema,
            },
            defaultValue,
            fkColumn: fk_column,
            fkSchema: fk_column ? schema : null,
            fkTable: column.fk_table,
            // since `rowid` is auto generated unique number, and `AUTO INCREMENT`
            // can only be applied to such columns, we consider them autoincrement
            // and we don't need to check for the existence of the modifier in
            // the `CREATE TABLE` statement.
            isAutoincrement: isRowId,
            isComputed,
            isRequired: !nullable && !isRowId && !isComputed && defaultValue == null,
            name: columnName,
            nullable,
            pkPosition: pk > 0 ? pk : null,
            schema,
            table: tableName,
          };
          return columnsRecord;
        }, {});
        schemas.main.tables[tableName] = {
          columns: columnsRecord,
          name: tableName,
          schema: "main",
        };
        return schemas;
      },
      {
        main: { tables: {}, name: "main" },
      },
    ),
    timezone: "UTC",
  };
}
/**
 * For testing purposes.
 */
export function mockIntrospect() {
  const query = { parameters: [], sql: "<mocked>" };
  const tables = mockTablesQuery();
  return createIntrospection({ query, tables });
}
