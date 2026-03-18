import {
  serializeError,
  type StudioBFFRequest,
} from "@enhanced-prisma-studio/studio-core/data/bff";

type D1HttpResponse = {
  errors?: Array<{ message?: string }>;
  result?: Array<{ results?: Array<Record<string, unknown>> }>;
  success?: boolean;
};

async function queryD1HttpApi(args: {
  accountId: string;
  apiToken: string;
  databaseId: string;
  sql: string;
  params?: unknown[];
}) {
  const { accountId, apiToken, databaseId, params = [], sql } = args;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ params, sql }),
  });

  const payload = (await response.json()) as D1HttpResponse;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.[0]?.message || `D1 HTTP query failed (${response.status})`);
  }

  return payload.result?.[0]?.results ?? [];
}

export function createD1StudioRequestExecutor(args: {
  accountId: string;
  apiToken: string;
  databaseId: string;
}) {
  const { accountId, apiToken, databaseId } = args;

  return async (payload: { data: StudioBFFRequest }) => {
    const { data } = payload;

    if (data.procedure === "query") {
      try {
        const rows = await queryD1HttpApi({
          accountId,
          apiToken,
          databaseId,
          params: [...data.query.parameters],
          sql: data.query.sql,
        });
        return [null, rows] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (data.procedure === "sequence") {
      const [firstQuery, secondQuery] = data.sequence;
      try {
        const firstRows = await queryD1HttpApi({
          accountId,
          apiToken,
          databaseId,
          params: [...firstQuery.parameters],
          sql: firstQuery.sql,
        });
        try {
          const secondRows = await queryD1HttpApi({
            accountId,
            apiToken,
            databaseId,
            params: [...secondQuery.parameters],
            sql: secondQuery.sql,
          });
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
        const batches: Array<Array<Record<string, unknown>>> = [];
        for (const query of data.queries) {
          const rows = await queryD1HttpApi({
            accountId,
            apiToken,
            databaseId,
            params: [...query.parameters],
            sql: query.sql,
          });
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
