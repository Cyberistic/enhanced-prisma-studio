import path from "node:path";

import { createClient } from "@libsql/client";
import {
  serializeError,
  type StudioBFFRequest,
} from "@enhanced-prisma-studio/studio-core/data/bff";

type DataRow = Record<string, unknown>;

function resolveSqliteUrl(rawUrl: string) {
  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }

  const filePath = rawUrl.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return rawUrl;
  }

  return `file:${path.resolve(process.cwd(), filePath)}`;
}

function normalizeRows(rows: unknown[]): DataRow[] {
  return rows.filter(
    (row): row is DataRow => typeof row === "object" && row != null && !Array.isArray(row),
  );
}

async function executeSqlQuery(
  client: ReturnType<typeof createClient>,
  query: {
    sql: string;
    parameters: readonly unknown[];
    transformations?: Record<string, unknown>;
  },
) {
  const result = await client.execute({
    sql: query.sql,
    args: [...query.parameters],
  });

  const rows = normalizeRows(result.rows ?? []);
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
        } catch {}
      }
    }

    return transformed;
  });
}

export function createStudioRequestExecutor(rawDatabaseUrl: string) {
  const databaseUrl = resolveSqliteUrl(rawDatabaseUrl);
  const client = createClient({ url: databaseUrl });

  return {
    close: async () => {
      client.close();
    },
    executeStudioRequest: async (payload: { data: StudioBFFRequest }) => {
      const { data } = payload;

      if (data.procedure === "query") {
        try {
          const rows = await executeSqlQuery(client, data.query as any);
          return [null, rows] as const;
        } catch (error) {
          return [serializeError(error), undefined] as const;
        }
      }

      if (data.procedure === "sequence") {
        const [firstQuery, secondQuery] = data.sequence;
        try {
          const firstRows = await executeSqlQuery(client, firstQuery as any);
          try {
            const secondRows = await executeSqlQuery(client, secondQuery as any);
            return [
              [null, firstRows],
              [null, secondRows],
            ] as const;
          } catch (secondError) {
            return [
              [null, firstRows],
              [serializeError(secondError), undefined],
            ] as const;
          }
        } catch (firstError) {
          return [[serializeError(firstError)]] as const;
        }
      }

      if (data.procedure === "transaction") {
        try {
          const batches: DataRow[][] = [];
          for (const query of data.queries) {
            const rows = await executeSqlQuery(client, query as any);
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
    },
  };
}
