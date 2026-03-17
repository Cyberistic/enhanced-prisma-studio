import { createPrismaStudioAdapter } from "../../prisma-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["DRIZZLE_DATABASE_URL"] as const;

export const createSQLiteDrizzleProvider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/drizzle");

  return createPrismaStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
