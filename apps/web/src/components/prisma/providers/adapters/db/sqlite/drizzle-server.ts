import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { serializeError, type StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import type { DataRow } from "@/components/prisma/types";
import type { SQLiteProviderServerConfig, SQLiteServerRequestExecutor } from "./types";
import { requireEnv } from "./types";

const REQUIRED_ENV = ["DRIZZLE_DATABASE_URL"] as const;

type RawSqlExecutor = {
  execute: (query: { sql: string; args?: unknown[] }) => Promise<{ rows: unknown[] }>;
};

function toRows(result: { rows: unknown[] } | undefined): DataRow[] {
  if (!result || !Array.isArray(result.rows)) {
    return [];
  }

  return result.rows.filter((row): row is DataRow => typeof row === "object" && row != null && !Array.isArray(row));
}

async function executeSqlQuery(rawExecutor: RawSqlExecutor, query: { sql: string; parameters: readonly unknown[]; transformations?: Record<string, unknown> }) {
  const result = await rawExecutor.execute({
    sql: query.sql,
    args: [...query.parameters],
  });

  const rows = toRows(result);

  if (!query.transformations) {
    return rows;
  }

  return rows.map((row) => {
    const transformed = { ...row };
    for (const [columnName, transformation] of Object.entries(query.transformations ?? {})) {
      if (transformation !== "json-parse") {
        continue;
      }

      const value = transformed[columnName];
      if (typeof value === "string") {
        try {
          transformed[columnName] = JSON.parse(value);
        } catch {
        }
      }
    }

    return transformed;
  });
}

export function createSQLiteDrizzleServerExecutor(config: SQLiteProviderServerConfig = {}): SQLiteServerRequestExecutor {
  const fallbackEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const env = {
    ...fallbackEnv,
    ...(config.env ?? {}),
  };

  requireEnv(env, REQUIRED_ENV, "sqlite/drizzle");

  const drizzleUrl = env.DRIZZLE_DATABASE_URL as string;
  const libsqlClient = createClient({ url: drizzleUrl });
  drizzle(libsqlClient);
  const rawExecutor = libsqlClient as unknown as RawSqlExecutor;

  return async ({ data }: { data: StudioBFFRequest }) => {
    if (data.procedure === "query") {
      try {
        const rows = await executeSqlQuery(rawExecutor, data.query as any);
        return [null, rows] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (data.procedure === "sequence") {
      const [firstQuery, secondQuery] = data.sequence;

      try {
        const firstResult = await executeSqlQuery(rawExecutor, firstQuery as any);
        try {
          const secondResult = await executeSqlQuery(rawExecutor, secondQuery as any);
          return [[null, firstResult], [null, secondResult]] as const;
        } catch (secondError) {
          return [[null, firstResult], [serializeError(secondError), undefined]] as const;
        }
      } catch (firstError) {
        return [[serializeError(firstError)]] as const;
      }
    }

    if (data.procedure === "transaction") {
      try {
        const batches: DataRow[][] = [];
        for (const query of data.queries) {
          const rows = await executeSqlQuery(rawExecutor, query as any);
          batches.push(rows);
        }
        return [null, batches] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (data.procedure === "sql-lint") {
      return [serializeError(new Error("SQL lint is not supported")), undefined] as const;
    }

    return [serializeError(new Error("Invalid procedure")), undefined] as const;
  };
}
