import { validateSqlForLint } from "../postgres-core/sql-lint";
import { asQuery } from "../query";
export function createLintDiagnosticsFromSQLiteError(args) {
    const { error, sql } = args;
    const positionOffset = Math.max(0, args.positionOffset ?? 0);
    const fallbackRange = getFallbackRange(sql.length);
    if (!(error instanceof Error)) {
        return [
            {
                from: fallbackRange.from + positionOffset,
                message: "SQL lint failed.",
                severity: "error",
                source: "sqlite",
                to: fallbackRange.to + positionOffset,
            },
        ];
    }
    const code = getSQLiteErrorCode(error);
    const inferredRange = inferRangeFromMessage(sql, error.message) ?? fallbackRange;
    return [
        {
            code,
            from: inferredRange.from + positionOffset,
            message: toSQLiteLintMessage(error.message),
            severity: "error",
            source: "sqlite",
            to: inferredRange.to + positionOffset,
        },
    ];
}
export async function lintSQLiteWithExplainFallback(executor, details, options) {
    const validation = validateSqlForLint(details.sql);
    if (!validation.ok) {
        return [
            null,
            {
                diagnostics: [validation.diagnostic],
                schemaVersion: details.schemaVersion,
            },
        ];
    }
    const diagnostics = [];
    for (const statement of validation.statements) {
        try {
            const explainQuery = asQuery(`EXPLAIN ${statement.statement}`);
            const [error] = await executor.execute(explainQuery, options);
            if (!error) {
                continue;
            }
            diagnostics.push(...createLintDiagnosticsFromSQLiteError({
                error,
                positionOffset: statement.from,
                sql: statement.statement,
            }));
        }
        catch (error) {
            diagnostics.push(...createLintDiagnosticsFromSQLiteError({
                error,
                positionOffset: statement.from,
                sql: statement.statement,
            }));
        }
    }
    return [
        null,
        {
            diagnostics,
            schemaVersion: details.schemaVersion,
        },
    ];
}
function getSQLiteErrorCode(error) {
    const withCode = error;
    return typeof withCode.code === "string" ? withCode.code : undefined;
}
function toSQLiteLintMessage(message) {
    if (message.toLowerCase().includes("interrupted")) {
        return "Lint query timed out. Simplify the statement and try again.";
    }
    return message;
}
function getFallbackRange(sqlLength) {
    if (sqlLength <= 0) {
        return { from: 0, to: 0 };
    }
    return { from: 0, to: 1 };
}
function inferRangeFromMessage(sql, message) {
    const nearMatch = /near\s+["'`]([^"'`]+)["'`]/i.exec(message);
    if (nearMatch?.[1]) {
        return findTokenRange(sql, nearMatch[1]);
    }
    const missingTableMatch = /no such table:\s*([^\s]+)/i.exec(message);
    if (missingTableMatch?.[1]) {
        return findTokenRange(sql, missingTableMatch[1]);
    }
    const missingColumnMatch = /no such column:\s*([^\s]+)/i.exec(message);
    if (missingColumnMatch?.[1]) {
        return findTokenRange(sql, missingColumnMatch[1]);
    }
    return null;
}
function findTokenRange(sql, rawToken) {
    const token = rawToken.trim().replace(/^['"`]|['"`]$/g, "");
    if (token.length === 0) {
        return null;
    }
    const lowerSql = sql.toLowerCase();
    const lowerToken = token.toLowerCase();
    const directIndex = lowerSql.indexOf(lowerToken);
    if (directIndex >= 0) {
        return {
            from: directIndex,
            to: Math.min(sql.length, directIndex + token.length),
        };
    }
    const splitToken = lowerToken.split(".").at(-1);
    if (!splitToken) {
        return null;
    }
    const splitIndex = lowerSql.indexOf(splitToken);
    if (splitIndex < 0) {
        return null;
    }
    return {
        from: splitIndex,
        to: Math.min(sql.length, splitIndex + splitToken.length),
    };
}
