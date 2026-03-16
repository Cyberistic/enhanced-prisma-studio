import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../prisma/generated/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

// Resolve relative file:// DATABASE_URL to an absolute path for libsql
// process.cwd() is packages/db when bun runs this script
const rawUrl = process.env.DATABASE_URL ?? "";
const DATABASE_URL = rawUrl.startsWith("file:")
    ? `file:${path.resolve(process.cwd(), rawUrl.slice("file:".length))}`
    : rawUrl;

const adapter = new PrismaLibSql({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Clear existing data
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();

    const users = Array.from({ length: 5 }, () => ({
        id: faker.string.nanoid(),
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
    }));

    for (const user of users) {
        const todoCount = faker.number.int({ min: 2, max: 6 });
        await prisma.user.create({
            data: {
                ...user,
                todos: {
                    create: Array.from({ length: todoCount }, () => ({
                        id: faker.string.nanoid(),
                        title: faker.hacker.phrase(),
                        description: faker.lorem.sentence(),
                        completed: faker.datatype.boolean(0.3),
                        dueDate: faker.date.soon({ days: 14 }),
                    })),
                },
            },
        });
    }

    const count = await prisma.todo.count();
    console.log(`✅  Seeded ${users.length} users and ${count} todos.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
