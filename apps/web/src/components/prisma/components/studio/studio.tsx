import type { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";
import { useTheme } from "next-themes";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { StudioThemeInput } from "../../types";
import { StudioContent } from "./content";
import { Navigation } from "./navigation";
import type { StudioView } from "./types";
import { createStudioHash, parseStudioHash } from "./url-state";

type StudioAdapter = Parameters<typeof UpstreamStudio>[0]["adapter"];

export function StudioShell(props: {
  adapter: StudioAdapter;
  theme?: StudioThemeInput;
}) {
  const { adapter, theme } = props;
  const { resolvedTheme } = useTheme();
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

  const studioStyle = useMemo(() => {
    const style: CSSProperties = { height: "100%", width: "100%" };

    if (!theme || typeof theme === "string") {
      return style;
    }

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const variables = theme[mode];

    const cssVars = style as CSSProperties & Record<string, string>;
    for (const [name, value] of Object.entries(variables)) {
      cssVars[name] = value;
    }

    return style;
  }, [resolvedTheme, theme]);

  if (!adapter) {
    return <div>Error: No adapter provided</div>;
  }

  const containerClasses = cn("relative flex flex-col w-full h-full min-h-0 font-sans");

  return (
    <div className="ps" style={studioStyle}>
      <div className={containerClasses}>
        <SidebarProvider
          defaultOpen
          open={isNavigationOpen}
          onOpenChange={setIsNavigationOpen}
          style={{ "--sidebar-width": "12rem" } as CSSProperties}
          className="!w-full !min-h-full !h-full"
        >
          <div className="relative isolate flex w-full flex-1 gap-0 bg-background h-full min-h-0 rounded-lg border border-border overflow-hidden">
            <Navigation
              activeTable={table}
              introspectionError={null}
              isIntrospecting={false}
              onOpenSearch={() => setIsNavigationOpen(true)}
              onRetryIntrospection={() => {}}
              onSchemaChange={setSchema}
              onSelectTable={setTable}
              onSelectView={setSelectedView}
              schema={schema}
              schemas={schemas}
              selectedView={selectedView}
              tableNames={["User", "Todo", "Project", "Task"]}
            />
            <div className="flex flex-1 min-w-0 h-full min-h-0 overflow-hidden bg-background">
              <div className="flex-1 min-w-0 min-h-0">
                <StudioContent
                  adapter={adapter}
                  isNavigationOpen={isNavigationOpen}
                  onSelectTable={setTable}
                  onToggleNavigation={() => setIsNavigationOpen((current) => !current)}
                  onSelectView={setSelectedView}
                  schema={schema}
                  selectedView={selectedView}
                  table={table}
                />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
