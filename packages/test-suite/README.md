# test-suite

Cross-provider compatibility tests for enhanced Prisma Studio adapters.

## SQLite (current)

Initialize test database with deterministic seed data:

```bash
bun run --filter @enhanced-prisma-studio/test-suite db:init:sqlite
```

Run provider compatibility checks using `kysely` as the baseline:

```bash
bun run --filter @enhanced-prisma-studio/test-suite test:providers:sqlite
```

One-shot init + test:

```bash
bun run --filter @enhanced-prisma-studio/test-suite test:sqlite
```

## Goal

All providers must produce the same normalized response shape for introspection
and representative table query operations.

## Remote D1 Integration

You can run real Cloudflare D1 integration tests (creates/uses DB, seeds schema/data,
then verifies providers against `kysely` baseline format):

```bash
bun run --filter @enhanced-prisma-studio/test-suite test:d1-remote
```

Required env vars:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `D1_TEST_DB_NAME` (default: `eps-provider-test`)

Notes:

- This uses Wrangler remote D1 (`wrangler d1 create/list/execute --remote`).
- If DB already exists, it reuses it and reseeds via SQL script.

### Prisma + D1 bootstrap note

`db:init:d1` now runs Alchemy (`alchemy.run.ts`) to execute Prisma schema workflow in
`packages/db` first (`prisma generate` + `prisma db push` against a local sqlite file),
then applies remote D1 schema/data via Wrangler.
