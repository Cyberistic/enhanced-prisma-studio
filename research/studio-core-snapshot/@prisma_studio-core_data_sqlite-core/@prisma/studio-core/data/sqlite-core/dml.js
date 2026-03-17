import { expressionBuilder, sql } from "kysely";
import { SimpleReferenceExpression } from "kysely";
import { buildFullTableSearchPlan, getFullTableSearchExpression, } from "../full-table-search";
import { applyInferredRowFilters, applyTransformations, compile, getSelectFilterExpression, } from "../query";
import { getSQLiteBuilder } from "./builder";
import { mockTablesQuery } from "./introspection";
/**
 * Returns a query that selects all columns from a table with an unbound row count as `__ps_count__`.
 */
export function getSelectQuery(details, requirements) {
    const { filter = { after: "and", filters: [], kind: "FilterGroup" }, fullTableSearchTerm, pageIndex, pageSize, sortOrder, table: { columns, name: tableName }, } = details;
    const builder = getSQLiteBuilder(requirements);
    const appliedFilterExpression = getSelectFilterExpression(filter.filters, columns);
    const fullTableSearchPlan = buildFullTableSearchPlan({
        searchTerm: fullTableSearchTerm,
        table: details.table,
    });
    const combinedWhereExpression = fullTableSearchPlan.predicates.length > 0
        ? (eb) => eb.and([
            appliedFilterExpression(eb),
            getFullTableSearchExpression(fullTableSearchPlan, {
                dialect: "sqlite",
            })(eb),
        ])
        : appliedFilterExpression;
    const AGG_NAME = "__ps_agg__";
    const COUNT_REF = "__ps_count__";
    const countQuery = builder
        .selectFrom(tableName)
        .where(combinedWhereExpression)
        .select((eb) => eb
        .cast(eb.fn.coalesce(eb.fn.countAll(), sql.lit(0)), "text")
        .as(COUNT_REF));
    return compile(builder
        .with(AGG_NAME, () => countQuery)
        .selectFrom(tableName)
        .innerJoin(AGG_NAME, (jb) => jb.onTrue())
        // TODO: cursor pagination?
        .where(combinedWhereExpression)
        .select(`${AGG_NAME}.${COUNT_REF}`)
        .select(Object.keys(columns))
        .$call((qb) => sortOrder.reduce((qb, item) => qb.orderBy(item.column, item.direction), qb))
        .limit(pageSize)
        // we're injecting the offset value here to avoid serialization complexity (`bigint` is a no-go for `JSON.stringify`).
        .offset(sql.lit(BigInt(pageIndex) * BigInt(pageSize))));
}
/**
 * For testing purposes.
 */
export function mockSelectQuery() {
    return [
        {
            created_at: new Date("2025-01-26T21:56:12.345Z"),
            deleted_at: null,
            id: 1,
            name: "John Doe",
            __ps_count__: "2",
            role: "admin",
            name_role: "Jonn Doe - admin",
        },
        {
            created_at: new Date("2025-01-26T20:56:12.345Z"),
            deleted_at: null,
            id: 2,
            name: "Jane Doe",
            __ps_count__: "2",
            role: "poweruser",
            name_role: "Jane Doe - poweruser",
        },
    ];
}
/**
 * Returns a query that deletes a given set of rows.
 */
export function getDeleteQuery(details, requirements) {
    const { rows, table: { columns, name: tableName }, } = details;
    const builder = getSQLiteBuilder(requirements);
    return compile(builder
        .deleteFrom(tableName)
        .$call(applyInferredRowFilters(rows, columns))
        .returning(Object.keys(columns))
        .returning(getCurrentTimestampMillis().as("__ps_deleted_at__")));
}
/**
 * Inserts one or more rows into a table and returns the inserted rows along with their `ctid`.
 */
export function getInsertQuery(details, requirements) {
    const { table: { columns, name: tableName }, rows, } = details;
    const builder = getSQLiteBuilder(requirements);
    return compile(builder
        .insertInto(tableName)
        .values(applyTransformations({
        columns,
        context: "insert",
        supportsDefaultKeyword: false,
        values: rows,
    }))
        .returning(Object.keys(columns))
        .returning(getCurrentTimestampMillis().as("__ps_inserted_at__")));
}
/**
 * Returns a query that updates a given row in a table with given changes.
 */
export function getUpdateQuery(details, requirements) {
    const { changes, row, table: { columns, name: tableName }, } = details;
    const builder = getSQLiteBuilder(requirements);
    return compile(builder
        .updateTable(tableName)
        .set(applyTransformations({
        columns,
        context: "update",
        supportsDefaultKeyword: false,
        values: changes,
    }))
        .$call(applyInferredRowFilters([row], columns))
        .returning(Object.keys(columns))
        .returning(getCurrentTimestampMillis().as("__ps_updated_at__")));
}
function getCurrentTimestampMillis() {
    const eb = expressionBuilder();
    return eb.cast(eb.cast(sql `(julianday('now') - 2440587.5) * 86400000.0`, "integer"), "text");
}
