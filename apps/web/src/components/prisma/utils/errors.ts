import { deserializeError, type SerializedError } from "@enhanced-prisma-studio/studio-core/data/bff";

export function toError(error: SerializedError | null | undefined) {
  return error ? deserializeError(error) : null;
}
