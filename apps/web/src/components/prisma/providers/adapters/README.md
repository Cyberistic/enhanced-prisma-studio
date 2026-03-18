# Data Adapters for Prisma Studio

This directory contains different data adapters for Prisma Studio. Adapters handle database operations, introspection, and queries.

## Available Adapters

### **Prisma Raw Studio Adapter** (`prisma-adapter.ts`)

Prisma-backed adapter that routes SQLite introspection SQL through Prisma raw queries.

### **SQLite DB Providers** (`db/sqlite/*`)

Provider scaffolds currently available:

- `createSQLiteKyselyProvider` (upstream-compatible baseline)
- `createSQLiteBunSqlProvider`
- `createSQLitePrismaRawProvider`
- `createSQLiteDrizzleProvider`
- `createSQLiteCloudflareD1Provider`
- `createSQLiteProviderFromEnv` (provider selection via env)

All SQLite providers currently share the same runtime adapter implementation and include strict env validation for provider-specific required params.

`createSQLiteCloudflareD1Provider` now adds query-level introspection fallback for D1:

- intercepts introspection SQL (`sqlite_master`, `sqlite_schema`, `pragma_table_list`, `pragma_table_xinfo`)
- executes those introspection queries through Cloudflare D1 HTTP API
- keeps regular queries on existing BFF execution path
- includes in-memory SQL-result cache (default 60s, configurable with `D1_HTTP_SCHEMA_CACHE_TTL_MS`)

Cloudflare D1 provider expects:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `D1_DATABASE_ID`

This aligns with the HTTP introspection strategy described in:

- https://gist.github.com/Cyberistic/b3152599b6849022d5aae879cbdf45fa

## Env-driven Provider Selection

`createSQLiteProviderFromEnv` reads `VITE_STUDIO_SQLITE_PROVIDER` and builds the matching provider.

Supported values:

- `prisma-raw` (default)
- `kysely`
- `drizzle`
- `bun.sql`
- `cloudflare-d1`

Expected env vars by provider:

- `prisma-raw`: `VITE_DATABASE_URL`
- `drizzle`: `VITE_DRIZZLE_DATABASE_URL` (fallback `VITE_DATABASE_URL`)
- `bun.sql`: `VITE_BUN_SQL_DATABASE_URL`
- `cloudflare-d1`: `VITE_CLOUDFLARE_ACCOUNT_ID`, `VITE_CLOUDFLARE_API_TOKEN`, `VITE_D1_DATABASE_ID` (optional `VITE_D1_HTTP_SCHEMA_CACHE_TTL_MS`)

```tsx
import {
  AdapterProvider,
  createPrismaRawStudioAdapter,
} from "@/components/prisma/providers/adapters";
import { PrismaStudio } from "@/components/prisma/studio";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function App() {
  return (
    <AdapterProvider adapter={createPrismaRawStudioAdapter({ executeStudioRequest })}>
      <PrismaStudio theme="dark" />
    </AdapterProvider>
  );
}
```

## Full Integration Pattern

Use both `URLProvider` and `AdapterProvider` for complete functionality:

```tsx
import { URLProvider, createTanStackRouterAdapter } from "@/components/prisma/providers/url";
import {
  AdapterProvider,
  createPrismaRawStudioAdapter,
} from "@/components/prisma/providers/adapters";
import { PrismaStudio } from "@/components/prisma/studio";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function StudioPage() {
  return (
    <URLProvider adapter={createTanStackRouterAdapter()}>
      <AdapterProvider adapter={createPrismaRawStudioAdapter({ executeStudioRequest })}>
        <div className="h-screen w-screen">
          <PrismaStudio theme="dark" />
        </div>
      </AdapterProvider>
    </URLProvider>
  );
}
```

## Creating a Custom Adapter

To create a custom adapter, implement the `StudioAdapter` interface from `@enhanced-prisma-studio/studio-core/ui`:

```tsx
import type { StudioAdapter } from "@/components/prisma/providers/adapters";

export function createCustomAdapter(): StudioAdapter {
  return {
    // Implement all required methods from StudioAdapter interface
    introspect: async (options) => {
      // Implementation
    },

    // ... other required methods
  };
}
```

Then use it with `AdapterProvider`:

```tsx
<AdapterProvider adapter={createCustomAdapter()}>
  <PrismaStudio theme="dark" />
</AdapterProvider>
```

## Hook Usage

Inside components wrapped by `AdapterProvider`, use the `useAdapter` hook:

```tsx
import { useAdapter } from "@/components/prisma/providers/adapters";

function MyComponent() {
  const adapter = useAdapter();

  // Use adapter for database operations
  const [error, result] = await adapter.introspect({
    abortSignal: new AbortController().signal,
  });

  return null;
}
```

## Interface Reference

### `AdapterProviderConfig`

```tsx
interface AdapterProviderConfig {
  executeStudioRequest: (request: unknown) => Promise<unknown>;
}
```

### `StudioAdapter`

Extends the core Prisma Studio adapter interface with methods for:

- Database introspection
- Query execution
- Transaction handling
- Sequence execution
- SQL linting and validation
