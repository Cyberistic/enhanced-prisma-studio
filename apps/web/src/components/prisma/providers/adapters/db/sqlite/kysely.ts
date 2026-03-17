import { createKyselyStudioAdapter } from "../../kysely-adapter";
import type { SQLiteProviderFactory } from "./types";

export const createSQLiteKyselyProvider: SQLiteProviderFactory = (config) => {
  if (!config.executeStudioRequest) {
    throw new Error("[sqlite/kysely] Missing executeStudioRequest in provider config");
  }

  return createKyselyStudioAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
};
