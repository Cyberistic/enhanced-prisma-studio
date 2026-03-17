import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { StudioHeader } from "../studio-header";
import type { StudioOperationEvent } from "../types";

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString();
}

function getQueryPreview(query?: { sql: string }) {
  if (!query?.sql) {
    return "No query";
  }

  const queryPreview = query.sql.slice(0, 100);
  return query.sql.length > 100 ? `${queryPreview}...` : queryPreview;
}

function OperationEventEntry(props: { event: StudioOperationEvent }) {
  const { event } = props;
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const isError = event.name === "studio_operation_error";

  return (
    <Card className="w-full overflow-clip rounded-sm border-ring/20 shadow-none">
      <CardHeader
        className={cn(
          "p-3 font-normal",
          isError ? "border-red-500/60 bg-red-500/10" : "border-green-500/60 bg-green-500/10",
        )}
      >
        <CardTitle className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle size={16} className="text-red-500" />
            ) : (
              <CheckCircle size={16} className="text-green-500" />
            )}
            <span>{event.payload.operation}, {formatTimestamp(event.timestamp)}</span>
          </div>
          <Badge variant={isError ? "destructive" : "secondary"} className="text-xs font-normal">
            {isError ? "Error" : "Success"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-3">
        {event.payload.query ? (
          <div className="flex flex-col gap-2" data-response-type="query">
            <div className="relative flex items-center justify-between">
              <button
                aria-expanded={isQueryExpanded}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => setIsQueryExpanded((current) => !current)}
              >
                {isQueryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                SQL Query
              </button>
              <Button
                aria-label="Copy SQL query"
                className="size-6"
                size="icon"
                variant="outline"
                onClick={() => {
                  if (!event.payload.query) {
                    return;
                  }

                  void navigator.clipboard.writeText(event.payload.query.sql);
                  toast.success("Query copied to clipboard");
                }}
              >
                <Copy data-icon="inline-start" />
              </Button>
            </div>

            <div
              className={cn(
                "overflow-x-auto rounded-sm border border-border bg-secondary/50 p-3 font-mono text-xs",
                isQueryExpanded ? "block max-h-64 whitespace-pre-wrap overflow-y-auto" : "max-h-10 overflow-hidden",
              )}
            >
              {isQueryExpanded ? event.payload.query.sql : getQueryPreview(event.payload.query)}
            </div>
          </div>
        ) : null}

        {isError && event.payload.error ? (
          <div className="flex flex-col gap-2" data-response-type="error">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TriangleAlert size={12} />
              Error Details
            </span>
            <div className="overflow-x-auto rounded-sm border border-red-400/20 bg-secondary/50 p-3 font-mono text-xs">
              <pre className="whitespace-pre-wrap font-mono text-xs text-red-400">
                {event.payload.error.adapterSource
                  ? `${event.payload.error.adapterSource}\n\n${event.payload.error.message}`
                  : event.payload.error.message}
              </pre>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ConsoleView(props: {
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onToggleNavigation: () => void;
  operationEvents: StudioOperationEvent[];
  schema: string;
  table: string | null;
}) {
  const { isIntrospecting, isNavigationOpen, onToggleNavigation, operationEvents, schema, table } = props;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [operationEvents]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <StudioHeader isNavigationOpen={isNavigationOpen} onToggleNavigation={onToggleNavigation}>
        <div className="text-xs text-muted-foreground">
          Operation Console · <span className="font-mono text-foreground/80">{schema}</span>
          <span className="mx-1 text-foreground/40">/</span>
          <span className="font-mono text-foreground/80">{table ?? "none"}</span>
        </div>
      </StudioHeader>

      <div ref={scrollRef} className="flex grow flex-col gap-2 overflow-y-auto bg-background/50 p-4">
        {operationEvents.length === 0 ? (
          isIntrospecting ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-18 w-full" />
              <Skeleton className="h-18 w-full" />
              <Skeleton className="h-18 w-full" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No operation events yet.
            </div>
          )
        ) : (
          operationEvents.map((eventItem) => (
            <OperationEventEntry key={eventItem.eventId} event={eventItem} />
          ))
        )}
      </div>
    </div>
  );
}
