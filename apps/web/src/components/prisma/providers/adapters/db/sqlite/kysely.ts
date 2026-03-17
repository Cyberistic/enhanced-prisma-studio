import { createPrismaStudioAdapter } from "../../prisma-adapter";
import type { SQLiteProviderFactory } from "./types";

export const createSQLiteKyselyProvider: SQLiteProviderFactory = (config) => {
  if (!config.executeStudioRequest) {
    throw new Error("[sqlite/kysely] Missing executeStudioRequest in provider config");
  }

  return createPrismaStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
