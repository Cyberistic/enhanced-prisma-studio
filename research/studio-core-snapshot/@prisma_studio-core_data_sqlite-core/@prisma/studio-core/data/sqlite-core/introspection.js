/**
 * SQLite introspection queries to be used by the SQLite adapter's introspect method.
 * @module sqlite-core/introspection
 *
 * References:
 * https://sqlite.org/pragma.html
 * https://sqlite.org/schematab.html
 */
import { expressionBuilder } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import { compile } from "../query";
import { getSQLiteBuilder } from "./builder";
export function getTablesQuery(requirements) {
    return compile(getSQLiteBuilder(requirements)
        .selectFrom(expressionBuilder()
        .fn("pragma_table_list", [])
        .as("tl"))
        .leftJoin("sqlite_schema as ss", (jb) => jb.onRef("ss.type", "=", "tl.type").onRef("ss.name", "=", "tl.name"))
        .where("tl.type", "in", ["table", "view"])
        // exclude temporary tables/views
        .where("tl.schema", "=", "main")
        // exclude system tables/views
        .where("tl.name", "not like", "sqlite_%")
        .select(["tl.name", "ss.sql"])
        // since we're excluding system tables, `ss.sql` should never be null here.
        .$narrowType()
        .select((eb) => [
        jsonArrayFrom(eb
            .selectFrom(eb
            .fn("pragma_table_xinfo", ["tl.name"])
            .as("txi"))
            .leftJoin(eb
            .fn("pragma_foreign_key_list", [
            "tl.name",
        ])
            .as("fkl"), "fkl.from", "txi.name")
            // exclude hidden columns
            .where("txi.hidden", "!=", 1)
            .select([
            "txi.dflt_value as default",
            "txi.name",
            "txi.pk",
            "txi.type as datatype",
            "fkl.table as fk_table",
            "fkl.to as fk_column",
        ])
            .select((eb) => [
            eb("txi.hidden", "in", [2, 3]).as("computed"),
            eb("txi.notnull", "=", 0).as("nullable"),
        ])).as("columns"),
    ]), { transformations: { columns: "json-parse" } });
}
/**
 * For testing purposes.
 */
export function mockTablesQuery() {
    return [
        {
            name: "animals",
            sql: "CREATE TABLE animals (id INTEGER PRIMARY KEY, name TEXT);",
            columns: [
                {
                    name: "id",
                    datatype: "INTEGER",
                    default: null,
                    pk: 1,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "name",
                    datatype: "TEXT",
                    default: null,
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
            ],
        },
        {
            name: "users",
            sql: "CREATE TABLE users (id UUID PRIMARY KEY, created_at TIMESTAMP, deleted_at TIMESTAMP, role varchar, name varchar, name_role text);",
            columns: [
                {
                    name: "id",
                    datatype: "INTEGER",
                    default: null,
                    pk: 1,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "created_at",
                    datatype: "TIMESTAMP",
                    default: "1970-01-01 00:00:00.000",
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "deleted_at",
                    datatype: "TIMESTAMP",
                    default: null,
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "role",
                    datatype: "varchar",
                    default: null,
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "name",
                    datatype: "varchar",
                    default: null,
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "name_role",
                    datatype: "text",
                    default: null,
                    pk: 0,
                    computed: 1,
                    nullable: 0,
                    fk_table: null,
                    fk_column: null,
                },
            ],
        },
        {
            name: "composite_pk",
            sql: "CREATE TABLE composite_pk (id UUID, name TEXT, created_at timestamp, PRIMARY KEY (id, name));",
            columns: [
                {
                    name: "id",
                    datatype: "text",
                    default: null,
                    pk: 1,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "name",
                    datatype: "TEXT",
                    default: null,
                    pk: 2,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
                {
                    name: "created_at",
                    datatype: "timestamp",
                    default: "1970-01-01 00:00:00.000",
                    pk: 0,
                    computed: 0,
                    nullable: 1,
                    fk_table: null,
                    fk_column: null,
                },
            ],
        },
    ];
}
