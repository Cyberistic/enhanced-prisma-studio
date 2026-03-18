import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const worker: any = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    const url = new URL(request.url);

    try {
      if (url.pathname === "/introspect" && request.method === "POST") {
        const body = await request.json() as { sql: string; parameters?: unknown[] };
        const result = await prisma.$queryRawUnsafe(body.sql, ...(body.parameters ?? []));
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/query" && request.method === "POST") {
        const body = await request.json() as { sql: string; parameters?: unknown[] };
        const result = await prisma.$queryRawUnsafe(body.sql, ...(body.parameters ?? []));
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        message: "Prisma D1 Worker",
        endpoints: {
          "POST /introspect": "Run introspection query",
          "POST /query": "Run raw SQL query",
        },
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};

export default worker;
