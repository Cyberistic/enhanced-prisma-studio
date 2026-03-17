import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ForkedStudioView } from "./types";

export function ForkedViewShell(props: {
  schema: string;
  table: string | null;
  view: ForkedStudioView;
  children: ReactNode;
}) {
  const { schema, table, view, children } = props;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/70 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{view.toUpperCase()}</Badge>
          <span>schema: {schema}</span>
          <span className={cn(table ? "" : "opacity-50")}>table: {table ?? "none"}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
