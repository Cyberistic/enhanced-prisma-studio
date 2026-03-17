import { createKyselyStudioAdapter } from "../../kysely-adapter";
import { executeStudioRequestDrizzle } from "@/components/prisma/utils/studio-request-drizzle";
import { createSQLiteDrizzleServerExecutor } from "./drizzle-server";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["DRIZZLE_DATABASE_URL"] as const;

export const createSQLiteDrizzleProvider: SQLiteProviderFactory = (config) => {
  if (config.env?.DRIZZLE_EXECUTION_MODE === "passthrough") {
    return createKyselyStudioAdapter({
      executeStudioRequest: config.executeStudioRequest,
    });
  }

  const mergedEnv = {
    DRIZZLE_DATABASE_URL:
      config.env?.DRIZZLE_DATABASE_URL ??
      import.meta.env.VITE_DRIZZLE_DATABASE_URL ??
      import.meta.env.VITE_DATABASE_URL,
  };

  requireEnv(mergedEnv, REQUIRED_ENV, "sqlite/drizzle");

  if (config.env?.DRIZZLE_EXECUTION_MODE === "direct") {
    const drizzleExecutor = createSQLiteDrizzleServerExecutor({
      env: {
        DRIZZLE_DATABASE_URL: mergedEnv.DRIZZLE_DATABASE_URL,
      },
    });

    return createKyselyStudioAdapter({
      executeStudioRequest: drizzleExecutor,
    });
  }

  return createKyselyStudioAdapter({
    executeStudioRequest: executeStudioRequestDrizzle,
  });
};
