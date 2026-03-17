/**
 * Data Adapter Provider Types
 *
 * Defines the interface for data adapters used by Prisma Studio.
 */

import type { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";
import type { StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

export type StudioAdapter = Parameters<typeof UpstreamStudio>[0]["adapter"];

export interface AdapterProviderConfig {
    /**
     * Function to execute studio requests
     */
    executeStudioRequest: (payload: { data: StudioBFFRequest }) => Promise<unknown>;
}
