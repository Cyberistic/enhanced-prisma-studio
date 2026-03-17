# URL Providers for Prisma Studio

This directory contains different URL state management adapters for Prisma Studio. Users can choose their preferred adapter based on their application's architecture.

## Available Adapters

### 1. **Nuqs Adapter** (`nuqs-adapter.ts`)
For applications using [Nuqs](https://nuqs.47ng.com/) for URL search parameter management.

```tsx
import { URLProvider, createNuqsPrismaAdapter } from '@/components/prisma/providers/url';
import { PrismaStudio } from '@/components/prisma/studio';

export function App() {
  return (
    <URLProvider adapter={createNuqsPrismaAdapter()}>
      <PrismaStudio theme="dark" />
    </URLProvider>
  );
}
```

### 2. **TanStack Router Adapter** (`tanstack-router-adapter.ts`)
For applications using [TanStack Router](https://tanstack.com/router/latest) for routing and URL management.

```tsx
import { URLProvider, createTanStackRouterAdapter } from '@/components/prisma/providers/url';
import { PrismaStudio } from '@/components/prisma/studio';

export function StudioRoute() {
  return (
    <URLProvider adapter={createTanStackRouterAdapter()}>
      <PrismaStudio theme="dark" />
    </URLProvider>
  );
}
```

## Custom Adapter

To create a custom adapter, implement the `URLProviderAdapter` interface:

```tsx
import type { URLProviderAdapter, URLParams } from '@/components/prisma/providers/url';

export function createCustomAdapter(): URLProviderAdapter {
  return {
    getParams(): URLParams {
      // Return current URL params from your state management
      return { schema: 'main', table: null, view: 'table' };
    },

    setParams(params: Partial<URLParams>): void {
      // Update URL params in your state management
    },

    onParamsChange(callback: (params: URLParams) => void): () => void {
      // Subscribe to param changes
      // Return unsubscribe function
      return () => {};
    },
  };
}
```

Then use it:

```tsx
<URLProvider adapter={createCustomAdapter()}>
  <PrismaStudio theme="dark" />
</URLProvider>
```

## Interface Reference

### `URLParams`
```tsx
interface URLParams {
  schema?: string;           // Database schema name
  table?: string | null;     // Database table name
  view?: string;             // Current view (table, schema, sql, console)
  pinnedColumns?: string;    // Comma-separated list of pinned column names
  sortOrder?: string;        // Sort configuration as JSON string
}
```

### `URLProviderAdapter`
```tsx
interface URLProviderAdapter {
  getParams(): URLParams;
  setParams(params: Partial<URLParams>): void;
  onParamsChange(callback: (params: URLParams) => void): () => void;
}
```

## Hook Usage

Inside components wrapped by `URLProvider`, use the `useURLProvider` hook:

```tsx
import { useURLProvider } from '@/components/prisma/providers/url';

function MyComponent() {
  const urlProvider = useURLProvider();
  
  // Get current params
  const params = urlProvider.getParams();
  
  // Update params
  urlProvider.setParams({ schema: 'public', table: 'users' });
  
  // Subscribe to changes
  const unsubscribe = urlProvider.onParamsChange((newParams) => {
    console.log('URL params changed:', newParams);
  });
  
  return null;
}
```
