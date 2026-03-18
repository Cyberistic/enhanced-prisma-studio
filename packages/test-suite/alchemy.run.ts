import alchemy from "alchemy";
import { D1Database } from "alchemy/cloudflare";
import { Exec } from "alchemy/os";

const app = await alchemy("enhanced-prisma-studio-test-suite");

const dbName = process.env.D1_TEST_DB_NAME ?? "eps-provider-test";

await Exec("prisma-generate-db", {
  command: "bunx prisma generate --schema ./prisma/schema/schema.prisma",
  cwd: ".",
  memoize: { patterns: ["./prisma/schema/schema.prisma"] },
});

await Exec("prisma-push-db", {
  command: "bunx prisma db push --schema ./prisma/schema/schema.prisma --accept-data-loss",
  cwd: ".",
  env: {
    DATABASE_URL: `file:${process.cwd()}/tmp/prisma-local.db`,
  },
});

export const d1Database = await D1Database("studio-test-d1", {
  adopt: true,
  name: dbName,
});

console.log(`Alchemy D1 database ready: ${dbName}`);

await app.finalize();
