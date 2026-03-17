/**
 * Data Adapter Provider Types
 *
 * Defines the interface for data adapters used by Prisma Studio.
 */

import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import type { StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

export type StudioAdapter = Adapter;

export interface AdapterProviderConfig {
    /**
     * Function to execute studio requests
     */
    executeStudioRequest: (payload: { data: StudioBFFRequest }) => Promise<unknown>;
}
