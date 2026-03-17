import type { Studio as UpstreamStudio } from "@enhanced-prisma-studio/studio-core/ui";
import { useTheme } from "next-themes";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { StudioThemeInput } from "../../types";
import { StudioContent } from "./content";
import { Navigation } from "./navigation";
import type { StudioView } from "./types";
import { createStudioHash, parseStudioHash } from "./url-state";

type StudioAdapter = Parameters<typeof UpstreamStudio>[0]["adapter"];
type StudioIntrospectionResult = Exclude<
  Awaited<ReturnType<StudioAdapter["introspect"]>>[1],
  undefined
>;
type StudioIntrospectionError = Exclude<
  Awaited<ReturnType<StudioAdapter["introspect"]>>[0],
  null | undefined
>;

function getQueryPreview(query: unknown): string | null {
  if (typeof query !== "object" || query == null || !("sql" in query)) {
    return null;
  }

  const querySql = (query as { sql?: unknown }).sql;
  if (typeof querySql !== "string" || querySql.length === 0) {
    return null;
  }

  const preview = querySql.slice(0, 120);
  return querySql.length > 120 ? `${preview}...` : preview;
}

export function StudioShell(props: {
  adapter: StudioAdapter;
  theme?: StudioThemeInput;
}) {
  const { adapter, theme } = props;
  const { resolvedTheme } = useTheme();
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [schema, setSchema] = useState("main");
  const [table, setTable] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<StudioView>("table");
  const [introspection, setIntrospection] =
    useState<StudioIntrospectionResult | null>(null);
  const [introspectionError, setIntrospectionError] =
    useState<StudioIntrospectionError | null>(null);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [introspectionRetryToken, setIntrospectionRetryToken] = useState(0);

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
    let isDisposed = false;
    const abortController = new AbortController();

    async function introspect() {
      setIsIntrospecting(true);

      const [error, result] = await adapter.introspect({
        abortSignal: abortController.signal,
      });

      if (isDisposed) {
        return;
      }

      if (error) {
        setIntrospectionError(error);
        setIsIntrospecting(false);
        return;
      }

      setIntrospection(result ?? null);
      setIntrospectionError(null);
      setIsIntrospecting(false);
    }

    void introspect();

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [adapter, introspectionRetryToken]);

  useEffect(() => {
    if (!introspection) {
      return;
    }

    const schemaNames = Object.keys(introspection.schemas);
    if (schemaNames.length === 0) {
      setTable(null);
      return;
    }

    const preferredSchema = introspection.schemas[schema]
      ? schema
      : adapter.defaultSchema && introspection.schemas[adapter.defaultSchema]
        ? adapter.defaultSchema
        : schemaNames[0] ?? schema;

    if (preferredSchema !== schema) {
      setSchema(preferredSchema);
      return;
    }

    const tableNamesInSchema = Object.keys(
      introspection.schemas[preferredSchema]?.tables ?? {},
    );

    if (tableNamesInSchema.length === 0) {
      setTable(null);
      return;
    }

    if (!table || !introspection.schemas[preferredSchema]?.tables[table]) {
      setTable(tableNamesInSchema[0] ?? null);
    }
  }, [adapter.defaultSchema, introspection, schema, table]);

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

  const schemas = useMemo(() => {
    const schemaNames = Object.keys(introspection?.schemas ?? {});

    if (schemaNames.length > 0) {
      return schemaNames;
    }

    return [schema];
  }, [introspection, schema]);

  const tableNames = useMemo(() => {
    if (!introspection) {
      return table ? [table] : [];
    }

    return Object.keys(introspection.schemas[schema]?.tables ?? {});
  }, [introspection, schema, table]);

  const activeTable = useMemo(() => {
    if (!table || !introspection) {
      return null;
    }

    return introspection.schemas[schema]?.tables[table] ?? null;
  }, [introspection, schema, table]);

  const schemaTables = useMemo(() => {
    return introspection?.schemas[schema]?.tables ?? {};
  }, [introspection, schema]);

  const introspectionNotice = useMemo(() => {
    if (!introspectionError) {
      return null;
    }

    return {
      message: introspectionError.message,
      queryPreview: getQueryPreview(introspectionError.query),
      source: introspectionError.adapterSource ?? "unknown",
    };
  }, [introspectionError]);

  const retryIntrospection = useCallback(() => {
    setIntrospectionRetryToken((current) => current + 1);
  }, []);

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
          className="w-full! min-h-full! h-full!"
        >
          <div className="relative isolate flex w-full flex-1 gap-0 bg-background h-full min-h-0 rounded-lg border border-border overflow-hidden">
            <Navigation
              activeTable={table}
              introspectionError={introspectionNotice}
              isIntrospecting={isIntrospecting}
              onOpenSearch={() => setIsNavigationOpen(true)}
              onRetryIntrospection={retryIntrospection}
              onSchemaChange={setSchema}
              onSelectTable={setTable}
              onSelectView={setSelectedView}
              schema={schema}
              schemas={schemas}
              selectedView={selectedView}
              tableNames={tableNames}
            />
            <div className="flex flex-1 min-w-0 h-full min-h-0 overflow-hidden bg-background">
              <div className="flex-1 min-w-0 min-h-0">
                <StudioContent
                  activeTable={activeTable}
                  adapter={adapter}
                  isNavigationOpen={isNavigationOpen}
                  isIntrospecting={isIntrospecting}
                  onSelectTable={setTable}
                  onToggleNavigation={() => setIsNavigationOpen((current) => !current)}
                  onSelectView={setSelectedView}
                  schemaTables={schemaTables}
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
