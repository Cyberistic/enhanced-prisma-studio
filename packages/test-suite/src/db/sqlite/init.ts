import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStudioRequestExecutor } from "../../shared/studio-executor";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testSuiteRoot = path.resolve(scriptDir, "../../..");

const dbFilePath = path.join(testSuiteRoot, "test-suite", "tmp", "sqlite", "provider-test.db");
const databaseUrl = `file:${dbFilePath}`;

async function main() {
  await mkdir(path.dirname(dbFilePath), { recursive: true });
  await rm(dbFilePath, { force: true });

  const { executeStudioRequest, close } = createStudioRequestExecutor(databaseUrl);

  const statements = [
    "PRAGMA foreign_keys = ON",
    "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, createdAt TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS todos (id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'medium', createdAt TEXT NOT NULL, FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, todoId TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT NOT NULL, FOREIGN KEY(todoId) REFERENCES todos(id) ON DELETE CASCADE)",
    "INSERT INTO users (id, email, name, createdAt) VALUES ('u1', 'alice@example.com', 'Alice', '2026-03-01T00:00:00.000Z'), ('u2', 'bob@example.com', 'Bob', '2026-03-02T00:00:00.000Z')",
    "INSERT INTO todos (id, userId, title, completed, priority, createdAt) VALUES ('t1', 'u1', 'Ship studio', 0, 'high', '2026-03-10T12:00:00.000Z'), ('t2', 'u1', 'Write docs', 1, 'medium', '2026-03-11T12:00:00.000Z'), ('t3', 'u2', 'Fix bug', 0, 'urgent', '2026-03-12T12:00:00.000Z')",
    "INSERT INTO comments (id, todoId, body, createdAt) VALUES ('c1', 't1', 'Need review', '2026-03-13T12:00:00.000Z'), ('c2', 't1', 'Looks good', '2026-03-14T12:00:00.000Z')",
  ];

  for (const sql of statements) {
    const [error] = (await executeStudioRequest({
      data: {
        procedure: "query",
        query: {
          parameters: [],
          sql,
        },
      },
    })) as readonly [unknown, unknown?];

    if (error) {
      throw new Error(`Failed to initialize sqlite test db: ${JSON.stringify(error)}`);
    }
  }

  await close();

  console.log(`Initialized sqlite test database at ${dbFilePath}`);
  console.log(`Use DATABASE_URL=${databaseUrl} for provider compatibility tests.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
