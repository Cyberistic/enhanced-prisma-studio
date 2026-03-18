import alchemy from "alchemy";
import { D1Database, Worker } from "alchemy/cloudflare";
import { Exec } from "alchemy/os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = await alchemy("enhanced-prisma-studio-test-suite");

const dbName = process.env.D1_TEST_DB_NAME ?? "eps-provider-test";

await Exec("prisma-generate-d1", {
  command: "bunx prisma generate --schema ./prisma/schema/schema.prisma",
  cwd: __dirname,
  memoize: { patterns: ["./prisma/schema/schema.prisma"] },
});

const migrationsDir = path.join(__dirname, "prisma/migrations");
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

export const d1Database = await D1Database("studio-test-d1", {
  adopt: true,
  name: dbName,
  migrationsDir,
});

export const worker = await Worker("prisma-d1-worker", {
  name: `${app.name}-${app.stage}-worker`,
  entrypoint: "src/worker/prisma-d1-worker.ts",
  adopt: true,
  bindings: {
    DB: d1Database,
  },
  compatibilityFlags: ["nodejs_compat"],
});

console.log(`D1 database ready: ${dbName}`);
console.log(`Prisma D1 Worker available at: ${worker.url}`);
console.log(`Set PRISMA_D1_WORKER_URL=${worker.url} for testing`);

await app.finalize();
