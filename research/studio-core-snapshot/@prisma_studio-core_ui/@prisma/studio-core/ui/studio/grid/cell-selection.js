export function normalizeSelectionRange(args) {
  const { end, start } = args;
  return {
    rowStart: Math.min(start.rowIndex, end.rowIndex),
    rowEnd: Math.max(start.rowIndex, end.rowIndex),
    columnStart: Math.min(start.columnIndex, end.columnIndex),
    columnEnd: Math.max(start.columnIndex, end.columnIndex),
  };
}
export function isCellInRange(args) {
  const { columnIndex, range, rowIndex } = args;
  return (
    rowIndex >= range.rowStart &&
    rowIndex <= range.rowEnd &&
    columnIndex >= range.columnStart &&
    columnIndex <= range.columnEnd
  );
}
export function parseClipboardMatrix(text) {
  const normalized = text.replace(/\r/g, "");
  if (normalized === "") {
    return [];
  }
  const lines = normalized.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.map((line) => line.split("\t"));
}
export function buildClipboardText(args) {
  const { columnIds, range, rows } = args;
  const lines = [];
  for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) {
      continue;
    }
    const values = [];
    for (let columnIndex = range.columnStart; columnIndex <= range.columnEnd; columnIndex++) {
      const columnId = columnIds[columnIndex];
      if (!columnId) {
        continue;
      }
      values.push(stringifyCellValue(row[columnId]));
    }
    lines.push(values.join("\t"));
  }
  return lines.join("\n");
}
export function buildPasteChanges(args) {
  const { columnIds, matrix, range, rowCount } = args;
  if (matrix.length === 0) {
    return [];
  }
  const matrixRowCount = matrix.length;
  const matrixColumnCount = Math.max(1, ...matrix.map((row) => Math.max(1, row.length)));
  const selectionRowCount = range.rowEnd - range.rowStart + 1;
  const selectionColumnCount = range.columnEnd - range.columnStart + 1;
  const fillSelectedRange = matrixRowCount === 1 && matrixColumnCount === 1;
  const targetRowCount = fillSelectedRange ? selectionRowCount : matrixRowCount;
  const targetColumnCount = fillSelectedRange ? selectionColumnCount : matrixColumnCount;
  const changes = [];
  for (let rowOffset = 0; rowOffset < targetRowCount; rowOffset++) {
    const rowIndex = range.rowStart + rowOffset;
    if (rowIndex < 0 || rowIndex >= rowCount) {
      continue;
    }
    for (let columnOffset = 0; columnOffset < targetColumnCount; columnOffset++) {
      const columnIndex = range.columnStart + columnOffset;
      const columnId = columnIds[columnIndex];
      if (!columnId) {
        continue;
      }
      if (args.canWrite && !args.canWrite({ columnId, rowIndex })) {
        continue;
      }
      const sourceRow = matrix[fillSelectedRange ? 0 : rowOffset] ?? [];
      const rawValue = sourceRow[fillSelectedRange ? 0 : columnOffset] ?? sourceRow[0] ?? "";
      changes.push({
        columnId,
        rowIndex,
        value: rawValue,
      });
    }
  }
  return changes;
}
function stringifyCellValue(value) {
  if (value == null) {
    return "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
