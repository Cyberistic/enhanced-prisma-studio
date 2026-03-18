import { SqliteAdapter, SqliteQueryCompiler } from "kysely";
import { getBuilder } from "../query";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSQLiteBuilder(requirements) {
  return getBuilder({
    ...requirements,
    Adapter: SqliteAdapter,
    QueryCompiler: SqliteQueryCompiler,
  });
}
