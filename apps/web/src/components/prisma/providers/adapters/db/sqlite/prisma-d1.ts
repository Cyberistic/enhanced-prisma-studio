import {
  serializeError,
  type StudioBFFRequest,
} from "@enhanced-prisma-studio/studio-core/data/bff";

import { createKyselyStudioAdapter } from "../../kysely-adapter";
import { requireEnv, type SQLiteProviderFactory } from "./types";

const REQUIRED_ENV = ["PRISMA_D1_WORKER_URL"] as const;

export const createSQLitePrismaD1Provider: SQLiteProviderFactory = (config) => {
  requireEnv(config.env, REQUIRED_ENV, "sqlite/prisma-d1");

  const workerUrl = config.env?.PRISMA_D1_WORKER_URL as string;

  async function executePrismaD1Request(request: StudioBFFRequest): Promise<unknown> {
    if (request.procedure === "query") {
      const sql = request.query.sql;
      const params = request.query.parameters;

      try {
        const response = await fetch(`${workerUrl}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql, parameters: params }),
        });

        if (!response.ok) {
          const error = await response.json() as { error?: string };
          return [new Error(error.error ?? "Prisma D1 request failed"), undefined] as const;
        }

        const result = await response.json();
        return [null, result] as const;
      } catch (error) {
        return [serializeError(error), undefined] as const;
      }
    }

    if (request.procedure === "sequence") {
      const [firstQuery, secondQuery] = request.sequence;

      const firstResult = (await executePrismaD1Request({
        procedure: "query",
        query: firstQuery,
      })) as readonly [unknown, unknown?];

      if (firstResult[0]) {
        return [[firstResult[0]]] as const;
      }

      const secondResult = (await executePrismaD1Request({
        procedure: "query",
        query: secondQuery,
      })) as readonly [unknown, unknown?];

      if (secondResult[0]) {
        return [
          [null, firstResult[1] ?? []],
          [secondResult[0], undefined],
        ] as const;
      }

      return [
        [null, firstResult[1] ?? []],
        [null, secondResult[1] ?? []],
      ] as const;
    }

    return [new Error("Unsupported procedure"), undefined] as const;
  }

  return createKyselyStudioAdapter({
    executeStudioRequest: async (payload) => executePrismaD1Request(payload.data),
  });
};
