import type { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { StudioEvent, StudioThemeInput } from "../types";
import { ForkedStudioContent } from "./forked/content";
import { IntrospectionStatusNotice } from "./forked/introspection-status-notice";
import { Navigation } from "./forked/navigation";
import { StudioHeader } from "./forked/studio-header";
import type { ForkedStudioView } from "./forked/types";
import { createForkedStudioHash, parseForkedStudioHash } from "./forked/url-state";
import { ForkedViewShell } from "./forked/view-shell";

export function ForkedStudio(props: {
  adapter: Parameters<typeof UpstreamStudio>[0]["adapter"];
  aiFilter?: Parameters<typeof UpstreamStudio>[0]["aiFilter"];
  onEvent?: (event: StudioEvent) => void;
  theme?: StudioThemeInput;
}) {
  const { adapter, aiFilter, onEvent, theme } = props;
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [schema, setSchema] = useState("main");
  const [table, setTable] = useState<string | null>("User");
  const [selectedView, setSelectedView] = useState<ForkedStudioView>("table");

  useEffect(() => {
    const applyFromHash = () => {
      const parsed = parseForkedStudioHash(window.location.hash);
      setSchema(parsed.schemaParam);
      setTable(parsed.tableParam);
      setSelectedView(parsed.viewParam);
    };

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);

    return () => {
      window.removeEventListener("hashchange", applyFromHash);
    };
  }, []);

  useEffect(() => {
    const nextHash = createForkedStudioHash({
      schemaParam: schema,
      tableParam: table,
      viewParam: selectedView,
    });

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [schema, selectedView, table]);

  const schemas = useMemo(() => ["main", "analytics", "public"], []);

  if (!adapter) {
    return <div>Error: No adapter provided</div>;
  }

  const containerClasses = cn("flex flex-col w-full h-full font-sans");

  return (
    <div className="ps" style={{ height: "100%", width: "100%" }}>
      <div className={containerClasses}>
        <div className="flex gap-0 bg-background relative min-h-full rounded-lg">
          <Navigation
            activeTable={table}
            isOpen={isNavigationOpen}
            onOpenSearch={() => setIsNavigationOpen(true)}
            onSchemaChange={setSchema}
            onSelectTable={setTable}
            onSelectView={setSelectedView}
            schema={schema}
            schemas={schemas}
            selectedView={selectedView}
          />
          <div className="flex w-full bg-secondary flex-col p-px rounded-lg self-start h-full min-h-full max-h-full overflow-clip">
            <div className="flex h-full min-h-0 flex-col bg-background">
              <StudioHeader
                isNavigationOpen={isNavigationOpen}
                onToggleNavigation={() => setIsNavigationOpen((current) => !current)}
              >
                <span className="text-sm text-foreground/80">Enhanced Studio Fork</span>
              </StudioHeader>
              <div className="px-3 pt-3">
                <IntrospectionStatusNotice
                  compact
                  description="Local fork shell active. Inner content is still upstream Studio while we replace views incrementally."
                  isRetrying={false}
                  message="Current phase: forking UI shell and shared shadcn primitives."
                  onRetry={() => {}}
                  queryPreview={null}
                  source="enhanced-prisma-studio"
                  title="Fork in progress"
                  variant="warning"
                />
              </div>
              <div className="flex-1 min-h-0">
                <ForkedViewShell schema={schema} table={table} view={selectedView}>
                  <ForkedStudioContent
                    adapter={adapter}
                    aiFilter={aiFilter}
                    onEvent={onEvent}
                    onSelectView={setSelectedView}
                    schema={schema}
                    selectedView={selectedView}
                    table={table}
                    theme={theme}
                  />
                </ForkedViewShell>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
