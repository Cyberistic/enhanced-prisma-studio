import { createSQLiteAdapter } from "@enhanced-prisma-studio/studio-core/data/sqlite-core";
import type { StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import type {
  PrismaStudioQuery,
  QueryResponse,
  SequenceResponse,
  SqlLintResponse,
  TransactionResponse,
} from "../types";
import { toError } from "./errors";

export function createKyselyStudioAdapter(args: {
  executeStudioRequest: (payload: { data: StudioBFFRequest }) => Promise<unknown>;
}) {
  const { executeStudioRequest } = args;

  return createSQLiteAdapter({
    executor: {
      execute: async (query: PrismaStudioQuery) => {
        const [error, result] = (await executeStudioRequest({
          data: { procedure: "query", query },
        })) as QueryResponse;

        if (error) {
          return [toError(error)!] as const;
        }

        return [null, result ?? []] as const;
      },
      executeSequence: async (sequence: readonly [PrismaStudioQuery, PrismaStudioQuery]) => {
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

        return [
          [null, firstResult],
          [null, secondResult ?? []],
        ] as const;
      },
      executeTransaction: async (queries: readonly PrismaStudioQuery[]) => {
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
    } as any,
  });
}
