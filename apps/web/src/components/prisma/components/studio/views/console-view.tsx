import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConsoleView(props: {
  schema: string;
  table: string | null;
}) {
  const { schema, table } = props;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="border-b border-border/70 px-4 py-2">
        <div className="text-xs text-muted-foreground">Operation Console</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm">Console (Local Shell)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Event timeline rendering has been switched to local shell routing for
              <Badge className="ml-2" variant="secondary">
                console
              </Badge>
              .
            </p>
            <p>
              Context: <span className="font-mono text-foreground/80">{schema}</span>
              <span className="mx-1 text-foreground/40">/</span>
              <span className="font-mono text-foreground/80">{table ?? "none"}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
