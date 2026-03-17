import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { IconPlay, IconSquare } from "./icons";

const DEFAULT_SQL = "select * from \"User\" limit 25;";

export function ForkedSqlView(props: {
  schema: string;
  table: string | null;
}) {
  const { schema, table } = props;
  const [sqlText, setSqlText] = useState(DEFAULT_SQL);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="border-b border-border/70 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRunning(true)}
            disabled={isRunning}
          >
            <IconPlay data-icon="inline-start" />
            Run
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRunning(false)}
            disabled={!isRunning}
          >
            <IconSquare data-icon="inline-start" />
            Stop
          </Button>
          <Badge variant="secondary">{isRunning ? "running" : "idle"}</Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="text-xs text-muted-foreground">
            SQL editor shell (local route) · schema:
            <span className="ml-1 font-mono text-foreground/80">{schema}</span>
            <span className="mx-1 text-foreground/40">·</span>
            table:
            <span className="ml-1 font-mono text-foreground/80">{table ?? "none"}</span>
          </div>
          <Textarea
            className="min-h-44 resize-none font-mono text-xs"
            value={sqlText}
            onChange={(event) => setSqlText(event.currentTarget.value)}
            spellCheck={false}
          />
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            SQL execution remains disabled in this shell while we migrate upstream SQL internals into local components.
          </div>
        </div>
      </div>
    </div>
  );
}