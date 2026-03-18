import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createSQLiteBunSqlProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/bun-sql";
import { createSQLiteCloudflareD1Provider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/cloudflare-d1";
import { createSQLiteDrizzleProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/drizzle";
import { createSQLiteKyselyProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/kysely";
import { createSQLitePrismaRawProvider } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/prisma-raw";
import type { SQLiteProviderFactory } from "../../../../apps/web/src/components/prisma/providers/adapters/db/sqlite/types";
import { createD1StudioRequestExecutor } from "../shared/d1-http-executor";

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

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testSuiteRoot = path.resolve(scriptDir, "../../..");
const workspaceRoot = path.resolve(testSuiteRoot, "../..");
const packageRoot = path.resolve(testSuiteRoot, "test-suite");

const d1DbName = process.env.D1_TEST_DB_NAME ?? "eps-provider-test";
const initToken = process.env.CLOUDFLARE_API_TOKEN ?? process.env.VITE_CLOUDFLARE_API_TOKEN;
const initAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

function getCloudflareAuth() {
  const cloudflareApiToken =
    process.env.CLOUDFLARE_API_TOKEN ?? process.env.VITE_CLOUDFLARE_API_TOKEN ?? initToken;
  const cloudflareAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.VITE_CLOUDFLARE_ACCOUNT_ID ?? initAccountId;

  if (!cloudflareApiToken || !cloudflareAccountId) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in environment.");
  }

  return {
    cloudflareAccountId,
    cloudflareApiToken,
  };
}

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

async function ensureRemoteDatabase() {
  const { cloudflareApiToken } = getCloudflareAuth();

  const listResult = await execFileAsync("bunx", ["wrangler", "d1", "list", "--json"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: cloudflareApiToken,
    },
  });

  const databases = JSON.parse(listResult.stdout) as Array<{ name: string }>;
  if (!databases.some((database) => database.name === d1DbName)) {
    await execFileAsync("bunx", ["wrangler", "d1", "create", d1DbName], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      },
    });
  }
}

async function getDatabaseId() {
  const { cloudflareApiToken } = getCloudflareAuth();
  const result = await execFileAsync("bunx", ["wrangler", "d1", "list", "--json"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: cloudflareApiToken,
    },
  });
  const databases = JSON.parse(result.stdout) as Array<{ name: string; uuid: string }>;
  const match = databases.find((database) => database.name === d1DbName);
  if (!match) {
    throw new Error(`Could not find D1 database '${d1DbName}' after creation/list.`);
  }
  return match.uuid;
}

async function seedRemoteDatabase() {
  const { cloudflareApiToken } = getCloudflareAuth();
  const schemaFilePath = path.join(packageRoot, "src", "db", "d1", "schema.sql");
  await execFileAsync(
    "bunx",
    ["wrangler", "d1", "execute", d1DbName, "--remote", "--file", schemaFilePath, "--yes"],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      },
    },
  );
}

async function captureProviderSnapshot(
  provider: ProviderRecord,
  executeStudioRequest: (payload: any) => Promise<unknown>,
) {
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
  const { cloudflareAccountId, cloudflareApiToken } = getCloudflareAuth();

  await ensureRemoteDatabase();
  const databaseId = await getDatabaseId();
  await seedRemoteDatabase();

  const executeStudioRequest = createD1StudioRequestExecutor({
    accountId: cloudflareAccountId as string,
    apiToken: cloudflareApiToken as string,
    databaseId,
  });

  const providers: ProviderRecord[] = [
    {
      create: createSQLiteKyselyProvider,
      env: {},
      name: "kysely",
    },
    {
      create: createSQLitePrismaRawProvider,
      env: {
        DATABASE_URL: `libsql://placeholder-${databaseId}`,
      },
      name: "prisma-raw",
    },
    {
      create: createSQLiteDrizzleProvider,
      env: {
        DRIZZLE_EXECUTION_MODE: "passthrough",
        DRIZZLE_DATABASE_URL: `libsql://placeholder-${databaseId}`,
      },
      name: "drizzle",
    },
    {
      create: createSQLiteBunSqlProvider,
      env: {
        BUN_SQL_DATABASE_URL: `libsql://placeholder-${databaseId}`,
      },
      name: "bun.sql",
    },
    {
      create: createSQLiteCloudflareD1Provider,
      env: {
        CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
        D1_DATABASE_ID: databaseId,
        D1_HTTP_SCHEMA_CACHE_TTL_MS: "0",
      },
      name: "cloudflare-d1",
    },
  ];

  const baselineProvider = providers[0]!;
  const baselineSnapshot = await captureProviderSnapshot(baselineProvider, executeStudioRequest);

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

  const failed = report.filter((entry) => !entry.ok);
  for (const entry of report) {
    console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}`);
    if (entry.details) {
      console.log(entry.details);
    }
  }

  if (failed.length > 0) {
    throw new Error(
      `Remote D1 provider compatibility checks failed for ${failed.length} provider(s).`,
    );
  }

  console.log(`All providers matched kysely baseline on remote D1 database '${d1DbName}'.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
