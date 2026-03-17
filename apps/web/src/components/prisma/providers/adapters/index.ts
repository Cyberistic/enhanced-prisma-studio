/**
 * Adapters for Prisma Studio
 *
 * This module provides different data adapters and providers.
 * Users can choose their preferred adapter based on their database setup.
 */

export type { StudioAdapter, AdapterProviderConfig } from "./types";
export { AdapterProvider, useAdapter, useOptionalAdapter } from "./adapter-provider";
export { createPrismaStudioAdapter } from "./prisma-adapter";
export {
  createSQLiteBunSqlProvider,
  createSQLiteCloudflareD1Provider,
  createSQLiteDrizzleProvider,
  createSQLiteKyselyProvider,
  createSQLitePrismaRawProvider,
} from "./db";
export type {
  SQLiteEnv,
  SQLiteProviderConfig,
  SQLiteProviderFactory,
} from "./db";
