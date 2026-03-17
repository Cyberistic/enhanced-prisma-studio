/**
 * Providers for Prisma Studio
 *
 * - URL state providers are under `providers/url`
 * - Data adapters are under `providers/adapters`
 */

export type { AdapterProviderConfig, StudioAdapter } from "./adapters";
export { AdapterProvider, createPrismaStudioAdapter, useAdapter } from "./adapters";

export type { URLParams, URLProviderAdapter } from "./url";
export { URLProvider, createNuqsPrismaAdapter, createTanStackRouterAdapter, useURLProvider } from "./url";
