import { createContext, type ReactNode, useContext } from "react";

import type { URLProviderAdapter } from "./types";

/**
 * Context for URL state management
 */
const URLProviderContext = createContext<URLProviderAdapter | null>(null);

export interface URLProviderProps {
  adapter: URLProviderAdapter;
  children?: ReactNode;
}

/**
 * URLProvider Component
 *
 * Wraps the Studio with a URL state management adapter.
 * Supports different adapters like Nuqs, TanStack Router, etc.
 *
 * @example
 * // With Nuqs
 * <URLProvider adapter={createNuqsPrismaAdapter()}>
 *   <PrismaStudio theme="dark" />
 * </URLProvider>
 *
 * @example
 * // With TanStack Router
 * <URLProvider adapter={createTanStackRouterAdapter()}>
 *   <PrismaStudio theme="dark" />
 * </URLProvider>
 */
export function URLProvider(props: URLProviderProps) {
  const { adapter, children } = props;

  return <URLProviderContext.Provider value={adapter}>{children}</URLProviderContext.Provider>;
}

/**
 * Hook to access the URL provider adapter
 */
export function useURLProvider(): URLProviderAdapter {
  const context = useContext(URLProviderContext);
  if (!context) {
    throw new Error("useURLProvider must be used within a URLProvider component");
  }
  return context;
}
