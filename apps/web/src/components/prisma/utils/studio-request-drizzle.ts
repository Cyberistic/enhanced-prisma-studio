import { createServerFn } from "@tanstack/react-start";

import type { StudioBFFRequest } from "@enhanced-prisma-studio/studio-core/data/bff";

import { createSQLiteDrizzleServerExecutor } from "../providers/adapters/db/sqlite/drizzle-server";

export const executeStudioRequestDrizzle = createServerFn({ method: "POST" })
  .inputValidator((payload: StudioBFFRequest) => payload)
  .handler(async ({ data }): Promise<any> => {
    const drizzleExecutor = createSQLiteDrizzleServerExecutor({
      env: {
        DRIZZLE_DATABASE_URL:
          process.env.DRIZZLE_DATABASE_URL ??
          process.env.VITE_DRIZZLE_DATABASE_URL ??
          process.env.VITE_DATABASE_URL,
      },
    });

    return drizzleExecutor({ data });
  });
