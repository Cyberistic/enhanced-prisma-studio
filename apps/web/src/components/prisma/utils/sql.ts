import type { PrismaStudioQuery, RawQueryable } from "../types";

export async function executeSqlQuery(queryable: RawQueryable, query: PrismaStudioQuery) {
  const rows = (await queryable.$queryRawUnsafe(
    query.sql,
    ...(query.parameters as unknown[]),
  )) as Record<string, unknown>[];

  if (!query.transformations) {
    return rows;
  }

  const transformations = (query.transformations ?? {}) as Record<string, unknown>;

  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }

    const transformedRow = { ...(row as Record<string, unknown>) };

    for (const [columnName, transformation] of Object.entries(transformations)) {
      if (transformation !== "json-parse") {
        continue;
      }

      const columnValue = transformedRow[columnName];
      if (typeof columnValue === "string") {
        try {
          transformedRow[columnName] = JSON.parse(columnValue);
        } catch {}
      }
    }

    return transformedRow;
  });
}
