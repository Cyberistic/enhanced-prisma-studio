import type { AdapterProviderConfig, StudioAdapter } from "../../types";

export type SQLiteEnv = Record<string, string | undefined>;

export interface SQLiteProviderConfig extends AdapterProviderConfig {
  env?: SQLiteEnv;
}

export interface SQLiteProviderServerConfig {
  env?: SQLiteEnv;
}

export type SQLiteProviderFactory<TConfig extends SQLiteProviderConfig = SQLiteProviderConfig> = (
  config: TConfig,
) => StudioAdapter;

export type SQLiteServerRequestExecutor = (payload: {
  data: import("@enhanced-prisma-studio/studio-core/data/bff").StudioBFFRequest;
}) => Promise<unknown>;

export function requireEnv(
  env: SQLiteEnv | undefined,
  requiredKeys: readonly string[],
  providerName: string,
) {
  const source = env ?? {};
  const missing = requiredKeys.filter((key) => {
    const value = source[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `[${providerName}] Missing required env param${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    );
  }
}
