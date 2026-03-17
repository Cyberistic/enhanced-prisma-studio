import type { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { StudioThemeInput } from "../../types";
import { StudioContent } from "./content";
import { Navigation } from "./navigation";
import { StudioHeader } from "./studio-header";
import type { StudioView } from "./types";
import { createStudioHash, parseStudioHash } from "./url-state";

type StudioAdapter = Parameters<typeof UpstreamStudio>[0]["adapter"];

export function StudioShell(props: {
  adapter: StudioAdapter;
  theme?: StudioThemeInput;
}) {
  const { adapter } = props;
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [schema, setSchema] = useState("main");
  const [table, setTable] = useState<string | null>("User");
  const [selectedView, setSelectedView] = useState<StudioView>("table");

  useEffect(() => {
    const applyFromHash = () => {
      const parsed = parseStudioHash(window.location.hash);
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
    const nextHash = createStudioHash({
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
                <span className="text-sm text-foreground/80">Enhanced Studio</span>
              </StudioHeader>
              <div className="flex-1 min-h-0">
                <StudioContent
                  adapter={adapter}
                  onSelectView={setSelectedView}
                  schema={schema}
                  selectedView={selectedView}
                  table={table}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
