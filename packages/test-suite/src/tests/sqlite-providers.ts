import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import { createSQLiteBunSqlProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/bun-sql";
import { createSQLiteCloudflareD1Provider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/cloudflare-d1";
import { createSQLiteDrizzleProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/drizzle";
import { createSQLiteKyselyProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/kysely";
import { createSQLitePrismaRawProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/prisma-raw";
import type { SQLiteProviderFactory } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/types";
import { createStudioRequestExecutor } from "../shared/studio-executor";

type ProviderRecord = {
  create: SQLiteProviderFactory;
  env: Record<string, string | undefined>;
  name: string;
};

type ProviderSnapshot = {
  introspect: {
    schemaCount: number;
    todoColumns: string[];
    todoTableFound: boolean;
  };
  query: {
    completedTodoCount: number;
    rows: Array<{ completed: number; id: string; title: string }>;
  };
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testSuiteRoot = path.resolve(scriptDir, "../../..");
const workspaceRoot = path.resolve(testSuiteRoot, "..");

dotenv.config({ path: path.join(workspaceRoot, "apps/web/.env") });

const sqliteUrl = `file:${path.join(testSuiteRoot, "tmp", "sqlite", "provider-test.db")}`;

function normalizeSnapshot(raw: {
  introspectResult: any;
  queryRows: Array<Record<string, unknown>>;
}): ProviderSnapshot {
  const schemas = raw.introspectResult?.schemas ?? {};
  const schemaCount = Object.keys(schemas).length;
  const todoTable = schemas.main?.tables?.todos ?? schemas.main?.tables?.Todo ?? null;
  const todoColumns = Object.keys(todoTable?.columns ?? {}).sort();

  return {
    introspect: {
      schemaCount,
      todoColumns,
      todoTableFound: Boolean(todoTable),
    },
    query: {
      completedTodoCount: raw.queryRows.filter((row) => Number(row.completed ?? 0) === 1).length,
      rows: raw.queryRows
        .map((row) => ({
          completed: Number(row.completed ?? 0),
          id: String(row.id ?? ""),
          title: String(row.title ?? ""),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
  };
}

async function captureProviderSnapshot(provider: ProviderRecord, executeStudioRequest: (payload: any) => Promise<unknown>) {
  const adapter = provider.create({
    env: provider.env,
    executeStudioRequest,
  });

  const [introspectionError, introspectResult] = await adapter.introspect({
    abortSignal: new AbortController().signal,
  });

  if (introspectionError) {
    throw new Error(`[${provider.name}] introspect failed: ${introspectionError.message}`);
  }

  const [queryError, queryResult] = await adapter.query(
    {
      filter: undefined,
      fullTableSearchTerm: undefined,
      pageIndex: 0,
      pageSize: 50,
      sortOrder: [{ column: "id", direction: "asc" }],
      table: introspectResult!.schemas.main!.tables.todos!,
    },
    {
      abortSignal: new AbortController().signal,
    },
  );

  if (queryError) {
    throw new Error(`[${provider.name}] query failed: ${queryError.message}`);
  }

  return normalizeSnapshot({
    introspectResult,
    queryRows: (queryResult?.rows ?? []) as Array<Record<string, unknown>>,
  });
}

async function main() {
  const { executeStudioRequest, close } = createStudioRequestExecutor(sqliteUrl);

  const providers: ProviderRecord[] = [
    {
      create: createSQLiteKyselyProvider,
      env: {},
      name: "kysely",
    },
    {
      create: createSQLitePrismaRawProvider,
      env: {
        DATABASE_URL: sqliteUrl,
      },
      name: "prisma-raw",
    },
    {
      create: createSQLiteDrizzleProvider,
      env: {
        DRIZZLE_EXECUTION_MODE: "direct",
        DRIZZLE_DATABASE_URL: sqliteUrl,
      },
      name: "drizzle",
    },
    {
      create: createSQLiteBunSqlProvider,
      env: {
        BUN_SQL_DATABASE_URL: sqliteUrl,
      },
      name: "bun.sql",
    },
    {
      create: createSQLiteCloudflareD1Provider,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "local-test",
        CLOUDFLARE_API_TOKEN: "local-test",
        D1_DATABASE_ID: "local-test",
        D1_HTTP_INTROSPECTION_DISABLED: "1",
      },
      name: "cloudflare-d1",
    },
  ];

  const baselineProvider = providers[0]!;
  const baselineSnapshot = await captureProviderSnapshot(
    baselineProvider,
    executeStudioRequest,
  );

  const report: Array<{ details?: string; name: string; ok: boolean }> = [];
  report.push({ name: baselineProvider.name, ok: true });

  for (const provider of providers.slice(1)) {
    try {
      const snapshot = await captureProviderSnapshot(provider, executeStudioRequest);
      const baselineSerialized = JSON.stringify(baselineSnapshot);
      const snapshotSerialized = JSON.stringify(snapshot);
      const ok = baselineSerialized === snapshotSerialized;

      report.push({
        details: ok
          ? undefined
          : `Snapshot mismatch\nexpected=${baselineSerialized}\nreceived=${snapshotSerialized}`,
        name: provider.name,
        ok,
      });
    } catch (error) {
      report.push({
        details: error instanceof Error ? error.message : String(error),
        name: provider.name,
        ok: false,
      });
    }
  }

  await close();

  const failed = report.filter((entry) => !entry.ok);
  for (const entry of report) {
    console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}`);
    if (entry.details) {
      console.log(entry.details);
    }
  }

  if (failed.length > 0) {
    throw new Error(`Provider compatibility checks failed for ${failed.length} provider(s).`);
  }

  console.log("All sqlite providers match kysely baseline response format.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
