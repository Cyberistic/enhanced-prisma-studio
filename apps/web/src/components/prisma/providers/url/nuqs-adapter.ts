/**
 * Nuqs URL Provider Adapter
 *
 * Integrates with the Nuqs library for URL state management.
 *
 * @example
 * import { useQueryState } from 'nuqs';
 * const adapter = createNuqsPrismaAdapter();
 */

import type { URLProviderAdapter, URLParams } from "./types";

/**
 * Creates a URL provider adapter for Nuqs
 *
 * Note: This implementation uses window.location and history API as a fallback.
 * For full integration with Nuqs, ensure your app is wrapped with <NuqsAdapter>.
 *
 * @returns URLProviderAdapter for use with URLProvider
 */
export function createNuqsPrismaAdapter(): URLProviderAdapter {
  const listeners: Array<(params: URLParams) => void> = [];

  function parseParams(): URLParams {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      schema: searchParams.get("schema") || undefined,
      table: searchParams.get("table") || null,
      view: searchParams.get("view") || undefined,
      pinnedColumns: searchParams.get("pinnedColumns") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
  }

  function notifyListeners() {
    const params = parseParams();
    listeners.forEach((callback) => callback(params));
  }

  // Listen to URL changes
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", notifyListeners);
  }

  return {
    getParams() {
      return parseParams();
    },

    setParams(params: Partial<URLParams>) {
      const searchParams = new URLSearchParams(window.location.search);

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, String(value));
        }
      });

      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.pushState({}, "", newUrl);
      notifyListeners();
    },

    onParamsChange(callback: (params: URLParams) => void) {
      listeners.push(callback);
      // Return unsubscribe function
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}
