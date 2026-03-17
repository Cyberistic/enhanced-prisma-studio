import { createKyselyStudioAdapter } from "../../kysely-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["BUN_SQL_DATABASE_URL"] as const;

export const createSQLiteBunSqlProvider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/bun.sql");

  return createKyselyStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
