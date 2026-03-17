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

const ROLES = ["admin", "member", "member", "member", "viewer", "viewer"] as const;
const PRIORITIES = ["low", "medium", "medium", "high", "urgent"] as const;
const PROJECT_STATUSES = ["active", "active", "active", "completed", "archived"] as const;
const TAG_NAMES = [
    "bug", "feature", "docs", "design", "backend", "frontend",
    "urgent", "nice-to-have", "refactor", "testing", "security", "perf",
];

async function main() {
    // Clear all data in dependency order
    await prisma.todoTag.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.todo.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Create tags
    const tags = await Promise.all(
        TAG_NAMES.map((name) =>
            prisma.tag.create({ data: { id: faker.string.nanoid(), name } })
        )
    );

    // Create projects (spread over past 6 months)
    const projectNames = [
        "Platform Rewrite", "Mobile App", "API Gateway", "Data Pipeline",
        "Admin Dashboard", "Customer Portal", "DevOps Infra", "Analytics Engine",
    ];
    const projects = await Promise.all(
        projectNames.map((name) =>
            prisma.project.create({
                data: {
                    id: faker.string.nanoid(),
                    name,
                    status: faker.helpers.arrayElement(PROJECT_STATUSES),
                    createdAt: faker.date.recent({ days: 180 }),
                },
            })
        )
    );

    // Create users (10 users, mix of roles, spread over past year)
    const userNames = [
        "Alice Chen", "Bob Martinez", "Carol White", "David Kim", "Eva Rossi",
        "Frank Zhang", "Grace Patel", "Hiro Tanaka", "Iris O'Brien", "Jake Thompson",
    ];
    const users = await Promise.all(
        userNames.map((name, i) =>
            prisma.user.create({
                data: {
                    id: faker.string.nanoid(),
                    name,
                    email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
                    role: ROLES[i % ROLES.length],
                    createdAt: faker.date.recent({ days: 365 }),
                },
            })
        )
    );

    // Create todos per user, each with a project and priority
    const allTodos: { id: string }[] = [];
    for (const user of users) {
        const todoCount = faker.number.int({ min: 4, max: 12 });
        for (let i = 0; i < todoCount; i++) {
            const todo = await prisma.todo.create({
                data: {
                    id: faker.string.nanoid(),
                    title: faker.hacker.phrase(),
                    description: faker.lorem.sentence(),
                    completed: faker.datatype.boolean(0.35),
                    priority: faker.helpers.arrayElement(PRIORITIES),
                    dueDate: faker.date.soon({ days: 21 }),
                    createdAt: faker.date.recent({ days: 90 }),
                    userId: user.id,
                    projectId: faker.helpers.arrayElement(projects).id,
                },
            });
            allTodos.push(todo);

            // Attach 1–3 random tags to each todo
            const todoTagCount = faker.number.int({ min: 1, max: 3 });
            const selectedTags = faker.helpers.arrayElements(tags, todoTagCount);
            await Promise.all(
                selectedTags.map((tag) =>
                    prisma.todoTag.create({
                        data: { todoId: todo.id, tagId: tag.id },
                    })
                )
            );
        }
    }

    // Create comments — heavier users comment more
    for (const todo of allTodos) {
        const commentCount = faker.number.int({ min: 0, max: 5 });
        for (let i = 0; i < commentCount; i++) {
            await prisma.comment.create({
                data: {
                    id: faker.string.nanoid(),
                    content: faker.lorem.sentences({ min: 1, max: 3 }),
                    createdAt: faker.date.recent({ days: 60 }),
                    todoId: todo.id,
                    userId: faker.helpers.arrayElement(users).id,
                },
            });
        }
    }

    const todoCount = await prisma.todo.count();
    const commentCount = await prisma.comment.count();
    const todoTagCount = await prisma.todoTag.count();
    console.log(
        `✅  Seeded ${users.length} users, ${projects.length} projects, ${tags.length} tags, ` +
        `${todoCount} todos, ${todoTagCount} todo-tags, ${commentCount} comments.`
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
