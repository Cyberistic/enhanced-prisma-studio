import { Table } from "@/data";
import { inferFilterObject } from "@/data/query";
function getRowId(row, table) {
    // FIXME: this doesn't work for tables without a primary key and causes a runtime error.
    const id = {
        filter: inferFilterObject(row, table.columns),
        table: `${table.schema}.${table.name}`,
    };
    return JSON.stringify(id);
}
function addRowIdToRow(args) {
    const { row, table, orderIndex } = args;
    return {
        ...row,
        __ps_rowid: getRowId(row, table),
        ...(orderIndex == null ? {} : { __ps_order: orderIndex }),
    };
}
export function addRowIdToResult(result, table) {
    const { row, rows } = result;
    if (row !== undefined) {
        return {
            ...result,
            row: addRowIdToRow({ row, table }),
        };
    }
    if (rows !== undefined) {
        return {
            ...result,
            rows: rows.map((currentRow, orderIndex) => addRowIdToRow({ row: currentRow, table, orderIndex })),
        };
    }
    return result;
}
