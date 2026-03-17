import { createServerFn } from "@tanstack/react-start";

import { serializeError, type StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import type { DataRow, RawQueryable } from "../types";
import { executeSqlQuery } from "./sql";

export const executeStudioRequest = createServerFn({ method: "POST" })
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
