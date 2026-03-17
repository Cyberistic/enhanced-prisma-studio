/**
 * Prisma Studio Adapter Factory
 *
 * Creates a Prisma-backed introspection adapter:
 * - Introspection SQL runs through Prisma raw execution
 * - Non-introspection procedures continue through the configured executor
 */

import type { StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import { executeStudioRequest as executePrismaRawStudioRequest } from "@/components/prisma/utils/studio-request";

import { createKyselyStudioAdapter } from "./kysely-adapter";
import type { AdapterProviderConfig, StudioAdapter } from "./types";

function isSqliteIntrospectionQuery(sql: string) {
    const normalized = sql.toLowerCase();
    return (
        normalized.includes("pragma_table_list") ||
        normalized.includes("pragma_table_xinfo") ||
        normalized.includes("sqlite_schema") ||
        normalized.includes("sqlite_master")
    );
}

async function executeQueryWithPrismaIntrospection(
    request: Extract<StudioBFFRequest, { procedure: "query" }>,
    executeStudioRequest: AdapterProviderConfig["executeStudioRequest"],
) {
    const hasParams = request.query.parameters.length > 0;
    if (isSqliteIntrospectionQuery(request.query.sql) && !hasParams) {
        return executePrismaRawStudioRequest({ data: request });
    }

    return executeStudioRequest({ data: request });
}

/**
 * Creates a Prisma-raw adapter for use with AdapterProvider.
 */
export function createPrismaRawStudioAdapter(config: AdapterProviderConfig): StudioAdapter {
    async function executeWithPrismaIntrospection(request: StudioBFFRequest): Promise<unknown> {
        if (request.procedure === "query") {
            return executeQueryWithPrismaIntrospection(request, config.executeStudioRequest);
        }

        if (request.procedure === "sequence") {
            const [firstQuery, secondQuery] = request.sequence;

            const firstResult = (await executeQueryWithPrismaIntrospection(
                {
                    procedure: "query",
                    query: firstQuery,
                },
                config.executeStudioRequest,
            )) as readonly [unknown, unknown?];

            if (firstResult[0]) {
                return [[firstResult[0]]] as const;
            }

            const secondResult = (await executeQueryWithPrismaIntrospection(
                {
                    procedure: "query",
                    query: secondQuery,
                },
                config.executeStudioRequest,
            )) as readonly [unknown, unknown?];

            if (secondResult[0]) {
                return [[null, firstResult[1] ?? []], [secondResult[0], undefined]] as const;
            }

            return [[null, firstResult[1] ?? []], [null, secondResult[1] ?? []]] as const;
        }

        return config.executeStudioRequest({ data: request });
    }

    return createKyselyStudioAdapter({
        executeStudioRequest: async (payload) => executeWithPrismaIntrospection(payload.data),
    });
}
