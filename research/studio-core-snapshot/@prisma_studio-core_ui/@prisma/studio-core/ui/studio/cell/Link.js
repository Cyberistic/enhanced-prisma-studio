import { Cell } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import uuid from "../../lib/short-uuid";
export function Link(props) {
  const { cell, column, createUrl, introspection } = props;
  const { fkSchema, fkTable, fkColumn } = column;
  return (
    <RelationLink
      createUrl={createUrl}
      filterColumn={fkColumn}
      filterValue={cell.getValue()}
      introspection={introspection}
      targetSchema={fkSchema}
      targetTable={fkTable}
    />
  );
}
export function RelationLink(props) {
  const { createUrl, filterColumn, filterValue, introspection, targetSchema, targetTable } = props;
  if (targetSchema == null || targetTable == null || filterColumn == null) {
    return null;
  }
  const table = introspection.schemas[targetSchema]?.tables[targetTable];
  if (!table) {
    return null;
  }
  if (filterValue == null) {
    return null;
  }
  return (
    <Button
      aria-label={`Open ${table.name}`}
      className="shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      size={"xs"}
      variant={"outline"}
      onClick={(e) => e.stopPropagation()}
      asChild
    >
      <a
        href={createUrl({
          schemaParam: targetSchema,
          tableParam: table.name,
          filterParam: JSON.stringify({
            kind: "FilterGroup",
            id: uuid.generate(),
            after: "and",
            filters: [
              {
                kind: "ColumnFilter",
                id: uuid.generate(),
                column: filterColumn,
                operator: "=",
                value: filterValue,
                after: "and",
              },
            ],
          }),
        })}
      >
        <ArrowRight size={12} />
      </a>
    </Button>
  );
}
