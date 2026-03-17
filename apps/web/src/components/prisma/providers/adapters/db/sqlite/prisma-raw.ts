import { createPrismaRawStudioAdapter } from "../../prisma-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["DATABASE_URL"] as const;

export const createSQLitePrismaRawProvider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/prisma-raw");

  return createPrismaRawStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
