import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "@enhanced-prisma-studio/env/server";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

const databaseUrl = env.DATABASE_URL.startsWith("file:")
  ? `file:${path.resolve(packageRoot, env.DATABASE_URL.slice("file:".length))}`
  : env.DATABASE_URL;

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
