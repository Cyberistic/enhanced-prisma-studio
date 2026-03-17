import { useMemo } from "react";

import { StudioShell } from "./components/studio/studio";
import type { StudioThemeInput } from "./types";
import { createPrismaStudioAdapter } from "./utils/adapter";
import { executeStudioRequest } from "./utils/studio-request";

/**
 * PrismaStudio Component
 *
 * A provider-agnostic Studio component that works with any URL query parameter provider.
 * Users can wrap this component with their preferred provider.
 *
 * @example
 * // With Nuqs
 * <NuqsProvider>
 *   <PrismaStudio theme="dark" />
 * </NuqsProvider>
 *
 * @example
 * // With TanStack Router (already provides query params)
 * <PrismaStudio theme="dark" />
 */
export function PrismaStudio(props: { theme?: StudioThemeInput }) {
  const { theme } = props;

  const adapter = useMemo(() => {
    return createPrismaStudioAdapter({ executeStudioRequest });
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden bg-background p-4 text-foreground">
      <StudioShell adapter={adapter} theme={theme} />
    </div>
  );
}
