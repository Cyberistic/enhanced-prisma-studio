import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_PRISMA_TELEMETRY_DISABLED: z.enum(["0", "1"]).optional().default("0"),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
