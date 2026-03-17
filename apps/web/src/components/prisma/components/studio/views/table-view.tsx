import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const sampleRowsByTable: Record<string, Record<string, unknown>[]> = {
  User: [
    { id: "u_001", email: "anne@example.com", name: "Anne", role: "admin" },
    { id: "u_002", email: "sam@example.com", name: "Sam", role: "editor" },
    { id: "u_003", email: "lea@example.com", name: "Lea", role: "viewer" },
  ],
  Todo: [
    { id: "t_001", title: "Refactor studio table", done: false, priority: "high" },
    { id: "t_002", title: "Ship local schema view", done: true, priority: "medium" },
  ],
  Project: [
    { id: "p_001", name: "Enhanced Studio", status: "active", owner: "Anne" },
  ],
  Task: [{ id: "k_001", label: "QA /studio-new", state: "todo" }],
};

export function TableView(props: {
  adapter: Adapter;
  schema: string;
  table: string | null;
}) {
  const { adapter: _adapter, schema, table } = props;
  const activeTableName = table ?? "User";

  const rows = useMemo(() => {
    return sampleRowsByTable[activeTableName] ?? [];
  }, [activeTableName]);

  const columns = useMemo(() => {
    const firstRow = rows[0];
    if (!firstRow) {
      return [];
    }

    return Object.keys(firstRow);
  }, [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/70 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">TABLE</Badge>
          <span>
            {schema}.{activeTableName}
          </span>
        </div>
      </div>

      <div className="h-full min-h-0 p-4">
        <Card className="h-full min-h-0">
          <CardHeader>
            <CardTitle className="text-sm">{activeTableName}</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-3.5rem)] min-h-0">
            <div className="h-full min-h-0 overflow-auto rounded-md border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((columnName) => (
                      <TableHead key={columnName}>{columnName}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={String((row.id as string | undefined) ?? index)}>
                      {columns.map((columnName) => (
                        <TableCell key={columnName} className="font-mono text-xs">
                          {String(row[columnName] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
