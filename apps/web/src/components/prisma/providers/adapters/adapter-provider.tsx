import { createContext, type ReactNode, useContext } from "react";

import type { StudioAdapter } from "./types";

/**
 * Context for data adapter (database operations)
 */
const AdapterContext = createContext<StudioAdapter | null>(null);

export interface AdapterProviderProps {
  adapter: StudioAdapter;
  children: ReactNode;
}

/**
 * AdapterProvider Component
 *
 * Provides the data adapter to Studio components.
 * Handles database operations and introspection.
 *
 * @example
 * // With Prisma SQLite adapter
 * <AdapterProvider adapter={createPrismaStudioAdapter({ executeStudioRequest })}>
 *   <PrismaStudio theme="dark" />
 * </AdapterProvider>
 */
export function AdapterProvider(props: AdapterProviderProps) {
  const { adapter, children } = props;

  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
}

/**
 * Hook to access the data adapter
 */
export function useAdapter(): StudioAdapter {
  const context = useContext(AdapterContext);
  if (!context) {
    throw new Error(
      "useAdapter must be used within an AdapterProvider component"
    );
  }
  return context;
}

export function useOptionalAdapter(): StudioAdapter | null {
  return useContext(AdapterContext);
}
