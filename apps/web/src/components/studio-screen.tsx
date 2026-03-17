import type { Query, SqlLintDiagnostic } from "@enhanced-prisma-studio/studio-core/data";
import {
  deserializeError,
  serializeError,
  type SerializedError,
  type StudioBFFRequest,
} from "@enhanced-prisma-studio/studio-core/data/bff";
import { createSQLiteAdapter } from "@enhanced-prisma-studio/studio-core/data/sqlite-core";
import { Studio } from "@enhanced-prisma-studio/studio-core/ui";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  studioTelemetryEnabled,
  toStudioTelemetryPayload,
  trackStudioTelemetry,
} from "@/lib/studio-telemetry";

type DataRow = Record<string, unknown>;

type SerializedEither<T> =
  | readonly [SerializedError, undefined?]
  | readonly [null, T];

type QueryResponse = SerializedEither<DataRow[]>;
type SequenceResponse =
  | readonly [readonly [SerializedError]]
  | readonly [readonly [null, DataRow[]], SerializedEither<DataRow[]>];
type TransactionResponse = SerializedEither<DataRow[][]>;
type SqlLintResponse = SerializedEither<{
  diagnostics: SqlLintDiagnostic[];
  schemaVersion?: string;
}>;

type RawQueryable = {
  $queryRawUnsafe: (sql: string, ...values: unknown[]) => Promise<DataRow[]>;
};

export type StudioThemeInput = Parameters<typeof Studio>[0]["theme"];
type StudioEvent = Parameters<NonNullable<Parameters<typeof Studio>[0]["onEvent"]>>[0];

async function executeSqlQuery(queryable: RawQueryable, query: Query<unknown>) {
  const rows = (await queryable.$queryRawUnsafe(
    query.sql,
    ...(query.parameters as unknown[]),
  )) as DataRow[];

  if (!query.transformations) {
    return rows;
  }

  const transformations = (query.transformations ?? {}) as Record<string, unknown>;

  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }

    const transformedRow = { ...(row as Record<string, unknown>) };
    for (const [columnName, transformation] of Object.entries(transformations)) {
      if (transformation !== "json-parse") {
        continue;
      }

      const columnValue = transformedRow[columnName];
      if (typeof columnValue === "string") {
        try {
          transformedRow[columnName] = JSON.parse(columnValue);
        } catch {
        }
      }
    }

    return transformedRow as DataRow;
  });
}

const executeStudioRequest = createServerFn({ method: "POST" })
  .inputValidator((payload: StudioBFFRequest) => payload)
  .handler(async ({ data }): Promise<any> => {
    const { default: prisma } = await import("@enhanced-prisma-studio/db");

    if (data.procedure === "query") {
      try {
        const rows = await executeSqlQuery(prisma, data.query);
        return [null, rows] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (data.procedure === "sequence") {
      const [firstQuery, secondQuery] = data.sequence;

      try {
        const firstResult = await executeSqlQuery(prisma, firstQuery);

        try {
          const secondResult = await executeSqlQuery(prisma, secondQuery);
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
        const transactionResults = (await prisma.$transaction(async (transactionClient: unknown) => {
          const resultSets: DataRow[][] = [];

          for (const query of data.queries) {
            const rows = await executeSqlQuery(transactionClient as RawQueryable, query);
            resultSets.push(rows);
          }

          return resultSets;
        })) as DataRow[][];

        return [null, transactionResults] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (data.procedure === "sql-lint") {
      return [serializeError(new Error("SQL lint is not supported")), undefined] as const;
    }

    return [serializeError(new Error("Invalid procedure")), undefined] as const;
  });

function toError(error: SerializedError | null | undefined) {
  return error ? deserializeError(error) : null;
}

export function StudioScreen(props: { theme?: StudioThemeInput }) {
  const { theme } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const adapter = useMemo(() => {
    const executor = {
      execute: async (query: Query<unknown>) => {
        const [error, result] = (await executeStudioRequest({
          data: { procedure: "query", query },
        })) as QueryResponse;

        if (error) {
          return [toError(error)!] as const;
        }

        return [null, result ?? []] as const;
      },
      executeSequence: async (sequence: readonly [Query<unknown>, Query<unknown>]) => {
        const response = (await executeStudioRequest({
          data: { procedure: "sequence", sequence },
        })) as SequenceResponse;

        if (response.length === 1) {
          const [[firstError]] = response;
          return [[toError(firstError)!]] as const;
        }

        const [[, firstResult], [secondError, secondResult]] = response;
        if (secondError) {
          return [[null, firstResult], [toError(secondError)!]] as const;
        }

        return [[null, firstResult], [null, secondResult ?? []]] as const;
      },
      executeTransaction: async (queries: readonly Query<unknown>[]) => {
        const [error, result] = (await executeStudioRequest({
          data: { procedure: "transaction", queries },
        })) as TransactionResponse;

        if (error) {
          return [toError(error)!] as const;
        }

        return [null, result ?? []] as const;
      },
      lintSql: async (details: { sql: string; schemaVersion?: string }) => {
        const [error, result] = (await executeStudioRequest({
          data: { procedure: "sql-lint", ...details },
        })) as SqlLintResponse;

        if (error) {
          return [toError(error)!] as const;
        }

        return [null, result] as const;
      },
    };

    return createSQLiteAdapter({
      executor: executor as any,
    });
  }, []);

  const onStudioEvent = useMemo(() => {
    if (!studioTelemetryEnabled) {
      return undefined;
    }

    return (event: StudioEvent) => {
      void trackStudioTelemetry({
        data: toStudioTelemetryPayload("enhanced", event),
      });
    };
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden p-4">
      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="h-full min-h-0 p-0">
          {mounted ? (
            <Studio adapter={adapter} theme={theme} onEvent={onStudioEvent} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading Studio...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
