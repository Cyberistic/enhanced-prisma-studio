import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testSuiteRoot = path.resolve(scriptDir, "../../..");
const workspaceRoot = path.resolve(testSuiteRoot, "../..");

dotenv.config({
  override: true,
  path: path.join(workspaceRoot, "apps/web/.env"),
});

if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
  dotenv.config({
    override: true,
    path: path.join(process.cwd(), "apps/web/.env"),
  });
}

const d1DbName = process.env.D1_TEST_DB_NAME ?? "eps-provider-test";
const schemaFilePath = path.join(testSuiteRoot, "src", "db", "d1", "schema.sql");
const seedFilePath = path.join(testSuiteRoot, "src", "db", "d1", "seed.sql");
const cloudflareApiToken =
  process.env.CLOUDFLARE_API_TOKEN ??
  process.env.VITE_CLOUDFLARE_API_TOKEN;

async function ensureRemoteDatabase() {
  const listResult = await execFileAsync("bunx", ["wrangler", "d1", "list", "--json"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: cloudflareApiToken,
    },
  });

  const databases = JSON.parse(listResult.stdout) as Array<{ name: string }>;
  if (!databases.some((database) => database.name === d1DbName)) {
    await execFileAsync("bunx", ["wrangler", "d1", "create", d1DbName], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      },
    });
  }
}

async function seedRemoteDatabase() {
  await execFileAsync("bunx", ["alchemy", "deploy", "alchemy.run.ts"], {
    cwd: testSuiteRoot,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      D1_TEST_DB_NAME: d1DbName,
    },
  });

  await execFileAsync(
    "bunx",
    ["wrangler", "d1", "execute", d1DbName, "--remote", "--file", schemaFilePath, "--yes"],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      },
    },
  );

  await execFileAsync(
    "bunx",
    ["wrangler", "d1", "execute", d1DbName, "--remote", "--file", seedFilePath, "--yes"],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      },
    },
  );
}

async function main() {
  if (!cloudflareApiToken) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN in environment.");
  }

  await ensureRemoteDatabase();
  await seedRemoteDatabase();

  console.log(`Remote D1 test database '${d1DbName}' seeded successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
