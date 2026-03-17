import { serializeError, type StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import { createPrismaStudioAdapter } from "../../prisma-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "D1_DATABASE_ID",
] as const;

export const createSQLiteCloudflareD1Provider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/cloudflare-d1");

  const accountId = config.env?.CLOUDFLARE_ACCOUNT_ID as string;
  const apiToken = config.env?.CLOUDFLARE_API_TOKEN as string;
  const databaseId = config.env?.D1_DATABASE_ID as string;
  const ttlMs = Number(config.env?.D1_HTTP_SCHEMA_CACHE_TTL_MS ?? 60_000);
  let cachedBySql = new Map<string, { at: number; rows: unknown[] }>();

  async function queryD1HttpApi(sql: string): Promise<unknown[]> {
    const cached = cachedBySql.get(sql);
    if (cached && Date.now() - cached.at < ttlMs) {
      return cached.rows;
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ sql }),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      result?: Array<{ results?: unknown[] }>;
      errors?: Array<{ message?: string }>;
    };

    if (!response.ok || payload.success === false) {
      const firstErrorMessage = payload.errors?.[0]?.message;
      throw new Error(firstErrorMessage || "Cloudflare D1 HTTP API query failed");
    }

    const rows = payload.result?.[0]?.results;
    if (!Array.isArray(rows)) {
      throw new Error("Cloudflare D1 HTTP API returned invalid results");
    }

    cachedBySql.set(sql, { at: Date.now(), rows });
    if (cachedBySql.size > 128) {
      cachedBySql = new Map([...cachedBySql.entries()].slice(-64));
    }

    return rows;
  }

  function isIntrospectionQuery(sql: string) {
    const normalized = sql.toLowerCase();
    return (
      normalized.includes("pragma_table_list") ||
      normalized.includes("pragma_table_xinfo") ||
      normalized.includes("sqlite_schema") ||
      normalized.includes("sqlite_master")
    );
  }

  async function executeWithIntrospectionFallback(
    request: StudioBFFRequest,
  ): Promise<unknown> {
    if (request.procedure === "query") {
      const sql = request.query.sql;
      const hasParams = request.query.parameters.length > 0;
      if (isIntrospectionQuery(sql) && !hasParams) {
        try {
          const rows = await queryD1HttpApi(sql);
          return [null, rows] as const;
        } catch (error) {
          return [serializeError(error), undefined] as const;
        }
      }

      return config.executeStudioRequest({ data: request });
    }

    if (request.procedure === "sequence") {
      const [firstQuery, secondQuery] = request.sequence;

      const firstResult = (await executeWithIntrospectionFallback({
        procedure: "query",
        query: firstQuery,
      })) as readonly [unknown, unknown?];

      if (firstResult[0]) {
        return [[firstResult[0]]] as const;
      }

      const secondResult = (await executeWithIntrospectionFallback({
        procedure: "query",
        query: secondQuery,
      })) as readonly [unknown, unknown?];

      if (secondResult[0]) {
        return [[null, firstResult[1] ?? []], [secondResult[0], undefined]] as const;
      }

      return [[null, firstResult[1] ?? []], [null, secondResult[1] ?? []]] as const;
    }

    return config.executeStudioRequest({ data: request });
  }

  return createPrismaStudioAdapter({
    executeStudioRequest: async (payload) => {
      return executeWithIntrospectionFallback(payload.data as StudioBFFRequest);
    },
  });
};
