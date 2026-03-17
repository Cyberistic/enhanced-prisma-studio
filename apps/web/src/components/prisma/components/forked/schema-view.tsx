import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { IconKey } from "./icons";

export function ForkedSchemaView(props: {
  schema: string;
  table: string | null;
  onSelectTableView: () => void;
}) {
  const { schema, table, onSelectTableView } = props;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/70 px-4 py-2">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground">
              <IconKey className="size-3 text-primary" />
            </span>
            <span>Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground">
              <span className="inline-flex size-3 items-center justify-center text-center leading-none">
                ?
              </span>
            </span>
            <span>Nullable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary p-0.5 text-primary-foreground">
              <IconKey className="size-3" />
            </span>
            <span>Foreign Key</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm">Schema Visualizer (Local Shell)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Rendering now comes from the local forked router for the <Badge variant="secondary">schema</Badge> view.
            </p>
            <p>
              Active schema: <span className="font-mono text-foreground/80">{schema}</span>
            </p>
            <p>
              Active table: <span className="font-mono text-foreground/80">{table ?? "none"}</span>
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={onSelectTableView}>
                Open table data view
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}