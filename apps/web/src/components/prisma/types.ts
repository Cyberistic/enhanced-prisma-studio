import type { Query, SqlLintDiagnostic } from "@enhanced-prisma-studio/studio-core/data";
import type { SerializedError } from "@enhanced-prisma-studio/studio-core/data/bff";
import type { Studio } from "@enhanced-prisma-studio/studio-core/ui";

export type DataRow = Record<string, unknown>;

export type SerializedEither<T> =
  | readonly [SerializedError, undefined?]
  | readonly [null, T];

export type QueryResponse = SerializedEither<DataRow[]>;
export type SequenceResponse =
  | readonly [readonly [SerializedError]]
  | readonly [readonly [null, DataRow[]], SerializedEither<DataRow[]>];
export type TransactionResponse = SerializedEither<DataRow[][]>;
export type SqlLintResponse = SerializedEither<{
  diagnostics: SqlLintDiagnostic[];
  schemaVersion?: string;
}>;

export type RawQueryable = {
  $queryRawUnsafe: (sql: string, ...values: unknown[]) => Promise<DataRow[]>;
};

export type PrismaStudioQuery = Query<unknown>;
export type StudioThemeInput = Parameters<typeof Studio>[0]["theme"];
export type StudioEvent = Parameters<
  NonNullable<Parameters<typeof Studio>[0]["onEvent"]>
>[0];
