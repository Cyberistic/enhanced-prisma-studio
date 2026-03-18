/**
 * URL Provider Adapter Interface
 *
 * Adapters handle different URL state management strategies.
 * Implementations can use Nuqs, TanStack Router, or any other solution.
 */

export interface URLParams {
  schema?: string;
  table?: string | null;
  view?: string;
  pinnedColumns?: string;
  sortOrder?: string;
}

export interface URLProviderAdapter {
  /**
   * Get current URL parameters
   */
  getParams(): URLParams;

  /**
   * Update URL parameters
   */
  setParams(params: Partial<URLParams>): void;

  /**
   * Subscribe to parameter changes
   */
  onParamsChange(callback: (params: URLParams) => void): () => void;
}
