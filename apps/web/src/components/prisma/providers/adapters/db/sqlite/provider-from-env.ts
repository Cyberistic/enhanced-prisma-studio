import type { AdapterProviderConfig, StudioAdapter } from "../../types";
import { createSQLiteBunSqlProvider } from "./bun-sql";
import { createSQLiteCloudflareD1Provider } from "./cloudflare-d1";
import { createSQLiteDrizzleProvider } from "./drizzle";
import { createSQLiteKyselyProvider } from "./kysely";
import { createSQLitePrismaRawProvider } from "./prisma-raw";

export type SQLiteProviderName =
  | "kysely"
  | "bun.sql"
  | "prisma-raw"
  | "drizzle"
  | "cloudflare-d1";

type EnvSource = Record<string, string | undefined>;

export function createSQLiteProviderFromEnv(config: AdapterProviderConfig & { env?: EnvSource }): StudioAdapter {
  const sourceEnv = config.env ?? ((import.meta as unknown as { env?: EnvSource }).env ?? {});
  const provider = (sourceEnv.VITE_STUDIO_SQLITE_PROVIDER ?? "prisma-raw") as SQLiteProviderName;

  if (provider === "kysely") {
    return createSQLiteKyselyProvider({ executeStudioRequest: config.executeStudioRequest });
  }

  if (provider === "bun.sql") {
    return createSQLiteBunSqlProvider({
      env: {
        BUN_SQL_DATABASE_URL: sourceEnv.VITE_BUN_SQL_DATABASE_URL,
      },
      executeStudioRequest: config.executeStudioRequest,
    });
  }

  if (provider === "drizzle") {
    return createSQLiteDrizzleProvider({
      env: {
        DRIZZLE_DATABASE_URL: sourceEnv.VITE_DRIZZLE_DATABASE_URL ?? sourceEnv.VITE_DATABASE_URL,
      },
      executeStudioRequest: config.executeStudioRequest,
    });
  }

  if (provider === "cloudflare-d1") {
    return createSQLiteCloudflareD1Provider({
      env: {
        CLOUDFLARE_ACCOUNT_ID: sourceEnv.VITE_CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: sourceEnv.VITE_CLOUDFLARE_API_TOKEN,
        D1_DATABASE_ID: sourceEnv.VITE_D1_DATABASE_ID,
        D1_HTTP_SCHEMA_CACHE_TTL_MS: sourceEnv.VITE_D1_HTTP_SCHEMA_CACHE_TTL_MS,
      },
      executeStudioRequest: config.executeStudioRequest,
    });
  }

  return createSQLitePrismaRawProvider({
    env: {
      DATABASE_URL: sourceEnv.VITE_DATABASE_URL,
    },
    executeStudioRequest: config.executeStudioRequest,
  });
}
