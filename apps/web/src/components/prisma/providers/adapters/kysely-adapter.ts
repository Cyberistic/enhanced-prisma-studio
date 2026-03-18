/**
 * Kysely Studio Adapter Factory
 *
 * Creates the upstream-compatible SQLite/Kysely-backed data adapter.
 */

import { createKyselyStudioAdapter as createBaseAdapter } from "../../utils/adapter";
import type { AdapterProviderConfig, StudioAdapter } from "./types";

/**
 * Creates a Kysely-backed Studio adapter for use with AdapterProvider.
 */
export function createKyselyStudioAdapter(config: AdapterProviderConfig): StudioAdapter {
  return createBaseAdapter({
    executeStudioRequest: config.executeStudioRequest,
  });
}
