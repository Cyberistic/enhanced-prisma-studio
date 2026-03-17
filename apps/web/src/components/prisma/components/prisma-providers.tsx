import { type ReactNode } from "react";

import type { StudioAdapter } from "../providers/adapters/types";
import type { URLProviderAdapter } from "../providers/url/types";

// Re-export provider components so they can be used as config markers inside PrismaProviders.
export { AdapterProvider } from "../providers/adapters/adapter-provider";
export { URLProvider } from "../providers/url/url-provider";

export type PrismaProvidersProps = {
  children: ReactNode;
  // These are extracted by PrismaStudio — not used at render time here.
  _urlAdapter?: URLProviderAdapter;
  _studioAdapter?: StudioAdapter;
};

/**
 * PrismaProviders
 *
 * Declarative config container for provider adapters. Place inside <PrismaStudio>;
 * PrismaStudio extracts <URLProvider /> and <AdapterProvider /> from its children
 * and wires the contexts around everything else.
 *
 * @example
 * <PrismaStudio theme={theme}>
 *   <PrismaProviders>
 *     <URLProvider adapter={createTanStackRouterAdapter()} />
 *     <AdapterProvider adapter={createPrismaRawStudioAdapter({ executeStudioRequest })} />
 *   </PrismaProviders>
 *   <PrismaStudioContent>
 *     ...
 *   </PrismaStudioContent>
 * </PrismaStudio>
 */
export function PrismaProviders(_props: PrismaProvidersProps) {
  // Intentionally empty — PrismaStudio handles rendering.
  return null;
}
