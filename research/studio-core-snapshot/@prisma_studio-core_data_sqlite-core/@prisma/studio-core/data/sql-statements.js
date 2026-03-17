function readDollarQuoteTag(sql, index) {
  if (sql[index] !== "$") {
    return null;
  }

  const rest = sql.slice(index);
  const match = /^\$\$|^\$[A-Za-z_][A-Za-z0-9_]*\$/.exec(rest);
  return match?.[0] ?? null;
}

function toSegment(sql, segmentStart, segmentEnd) {
  let from = segmentStart;
  let to = segmentEnd;

  while (from < segmentEnd && /\s/.test(sql[from])) {
    from += 1;
  }

  while (to > from && /\s/.test(sql[to - 1])) {
    to -= 1;
  }

  if (from >= to) {
    return null;
  }

  return {
    from,
    statement: sql.slice(from, to),
    to,
  };
}

export function splitTopLevelSqlStatements(sql) {
  const segments = [];

  let depth = 0;
  let segmentStart = 0;

  let inLineComment = false;
  let inBlockComment = false;
  let inSingleQuotedString = false;
  let inDoubleQuotedString = false;
  let inDollarQuotedStringTag = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inDollarQuotedStringTag) {
      if (sql.startsWith(inDollarQuotedStringTag, index)) {
        index += inDollarQuotedStringTag.length - 1;
        inDollarQuotedStringTag = null;
      }
      continue;
    }

    if (inSingleQuotedString) {
      if (char === "'") {
        if (next === "'") {
          index += 1;
        } else {
          inSingleQuotedString = false;
        }
      }
      continue;
    }

    if (inDoubleQuotedString) {
      if (char === '"') {
        if (next === '"') {
          index += 1;
        } else {
          inDoubleQuotedString = false;
        }
      }
      continue;
    }

    if (char === "-" && next === "-") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'") {
      inSingleQuotedString = true;
      continue;
    }

    if (char === '"') {
      inDoubleQuotedString = true;
      continue;
    }

    if (char === "$") {
      const dollarQuoteTag = readDollarQuoteTag(sql, index);

      if (dollarQuoteTag) {
        inDollarQuotedStringTag = dollarQuoteTag;
        index += dollarQuoteTag.length - 1;
        continue;
      }
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === ";" && depth === 0) {
      const segment = toSegment(sql, segmentStart, index);

      if (segment) {
        segments.push(segment);
      }

      segmentStart = index + 1;
    }
  }

  const finalSegment = toSegment(sql, segmentStart, sql.length);

  if (finalSegment) {
    segments.push(finalSegment);
  }

  return segments;
}

export function getTopLevelSqlStatementAtCursor(args) {
  const { cursorIndex, sql } = args;
  const segments = splitTopLevelSqlStatements(sql);

  if (segments.length === 0) {
    return null;
  }

  const clampedCursorIndex = Math.max(0, Math.min(sql.length, cursorIndex));
  let previousSegment = null;

  for (const segment of segments) {
    if (clampedCursorIndex < segment.from) {
      return previousSegment ?? segment;
    }

    if (clampedCursorIndex <= segment.to) {
      return segment;
    }

    previousSegment = segment;
  }

  return previousSegment;
}
