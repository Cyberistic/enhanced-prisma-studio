/**
 * Adapters for Prisma Studio
 *
 * This module provides different data adapters and providers.
 * Users can choose their preferred adapter based on their database setup.
 */

export type { StudioAdapter, AdapterProviderConfig } from "./types";
export { AdapterProvider, useAdapter, useOptionalAdapter } from "./adapter-provider";
export { createKyselyStudioAdapter } from "./kysely-adapter";
export { createPrismaRawStudioAdapter } from "./prisma-adapter";
export {
  createSQLiteBunSqlProvider,
  createSQLiteCloudflareD1Provider,
  createSQLiteDrizzleProvider,
  createSQLiteKyselyProvider,
  createSQLiteProviderFromEnv,
  createSQLitePrismaRawProvider,
} from "./db";
export type {
  SQLiteEnv,
  SQLiteProviderName,
  SQLiteProviderConfig,
  SQLiteProviderFactory,
} from "./db";
