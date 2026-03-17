/**
 * Prisma Studio Adapter Factory
 *
 * Creates the default data adapter for all database operations.
 */

import { createPrismaStudioAdapter as createBaseAdapter } from "../../utils/adapter";
import type { AdapterProviderConfig, StudioAdapter } from "./types";

/**
 * Creates a Prisma Studio adapter for use with AdapterProvider
 *
 * @param config Configuration object with executeStudioRequest function
 * @returns StudioAdapter for database operations
 *
 * @example
 * <AdapterProvider adapter={createPrismaStudioAdapter({ executeStudioRequest })}>
 *   <PrismaStudio theme="dark" />
 * </AdapterProvider>
 */
export function createPrismaStudioAdapter(config: AdapterProviderConfig): StudioAdapter {
    return createBaseAdapter({
        executeStudioRequest: config.executeStudioRequest,
    });
}
