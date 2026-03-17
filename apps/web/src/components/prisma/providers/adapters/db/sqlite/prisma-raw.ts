import { createPrismaStudioAdapter } from "../../prisma-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["DATABASE_URL"] as const;

export const createSQLitePrismaRawProvider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/prisma-raw");

  return createPrismaStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
