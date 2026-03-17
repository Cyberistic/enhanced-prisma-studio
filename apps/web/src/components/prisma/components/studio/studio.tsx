import type { Adapter, SortOrderItem } from "@enhanced-prisma-studio/studio-core/data";
import { useTheme } from "next-themes";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { StudioThemeInput } from "../../types";
import { StudioContent } from "./content";
import { Navigation } from "./navigation";
import {
  DEFAULT_STUDIO_VIEW_DEFINITIONS,
  type StudioOperationEvent,
  type StudioSectionDefinition,
  type StudioView,
  type StudioViewDefinition,
} from "./types";
import { createStudioHash, parseStudioHash } from "./url-state";

type StudioAdapter = Adapter;
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

function hasStudioHashView(hash: string): boolean {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const search = raw.startsWith("?") ? raw : `?${raw}`;
  const params = new URLSearchParams(search);
  return params.has("view");
}

function createOperationEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toOperationQuery(query: unknown): { parameters?: unknown[]; sql: string } | undefined {
  if (typeof query !== "object" || query == null || !("sql" in query)) {
    return undefined;
  }

  const querySql = (query as { sql?: unknown }).sql;
  if (typeof querySql !== "string" || querySql.length === 0) {
    return undefined;
  }

  const queryParameters = (query as { parameters?: unknown }).parameters;
  const parameters = Array.isArray(queryParameters)
    ? queryParameters
    : undefined;

  return {
    parameters,
    sql: querySql,
  };
}

function toOperationError(error: unknown): { adapterSource?: string; message: string } {
  if (error instanceof Error) {
    const adapterSource =
      typeof (error as { adapterSource?: unknown }).adapterSource === "string"
        ? ((error as { adapterSource?: string }).adapterSource as string)
        : undefined;

    return {
      adapterSource,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

export function StudioShell(props: {
  adapter: StudioAdapter;
  defaultView?: StudioView;
  sectionDefinitions?: readonly StudioSectionDefinition[];
  theme?: StudioThemeInput;
  viewDefinitions?: readonly StudioViewDefinition[];
}) {
  const {
    adapter,
    defaultView,
    sectionDefinitions,
    theme,
    viewDefinitions = DEFAULT_STUDIO_VIEW_DEFINITIONS,
  } = props;
  const { resolvedTheme } = useTheme();
  const availableSections = useMemo<StudioSectionDefinition[]>(() => {
    if (sectionDefinitions && sectionDefinitions.length > 0) {
      const normalizedSections: StudioSectionDefinition[] = [];

      for (const sectionDefinition of sectionDefinitions) {
        const dedupedViews = new Map<StudioView, StudioViewDefinition>();
        for (const viewDefinition of sectionDefinition.views) {
          dedupedViews.set(viewDefinition.id, viewDefinition);
        }

        if (dedupedViews.size === 0) {
          continue;
        }

        normalizedSections.push({
          id: sectionDefinition.id,
          header: sectionDefinition.header,
          views: Array.from(dedupedViews.values()),
        });
      }

      if (normalizedSections.length > 0) {
        return normalizedSections;
      }
    }

    const dedupedViews = new Map<StudioView, StudioViewDefinition>();
    for (const viewDefinition of viewDefinitions) {
      dedupedViews.set(viewDefinition.id, viewDefinition);
    }

    if (dedupedViews.size === 0) {
      for (const fallbackViewDefinition of DEFAULT_STUDIO_VIEW_DEFINITIONS) {
        dedupedViews.set(fallbackViewDefinition.id, fallbackViewDefinition);
      }
    }

    return [
      {
        id: "default",
        views: Array.from(dedupedViews.values()),
      },
    ];
  }, [sectionDefinitions, viewDefinitions]);
  const availableViews = useMemo<StudioViewDefinition[]>(() => {
    const dedupedViews = new Map<StudioView, StudioViewDefinition>();

    for (const sectionDefinition of availableSections) {
      for (const viewDefinition of sectionDefinition.views) {
        dedupedViews.set(viewDefinition.id, viewDefinition);
      }
    }

    return Array.from(dedupedViews.values());
  }, [availableSections]);
  const availableViewSet = useMemo(() => {
    return new Set(availableViews.map((viewDefinition) => viewDefinition.id));
  }, [availableViews]);
  const initialView = useMemo<StudioView>(() => {
    if (defaultView && availableViewSet.has(defaultView)) {
      return defaultView;
    }

    return availableViews[0]?.id ?? "table";
  }, [availableViewSet, availableViews, defaultView]);
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [schema, setSchema] = useState("main");
  const [table, setTable] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<StudioView>(initialView);
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrderItem[]>([]);
  const [introspection, setIntrospection] =
    useState<StudioIntrospectionResult | null>(null);
  const [introspectionError, setIntrospectionError] =
    useState<StudioIntrospectionError | null>(null);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [introspectionRetryToken, setIntrospectionRetryToken] = useState(0);
  const [operationEvents, setOperationEvents] = useState<StudioOperationEvent[]>([]);

  const handleOperationEvent = useCallback((event: StudioOperationEvent) => {
    setOperationEvents((currentEvents) => {
      const nextEvents = [...currentEvents, event];

      if (nextEvents.length <= 100) {
        return nextEvents;
      }

      return nextEvents.slice(nextEvents.length - 100);
    });
  }, []);

  const instrumentedAdapter = useMemo<StudioAdapter>(() => {
    const emitSuccess = (operation: string, query: unknown) => {
      handleOperationEvent({
        eventId: createOperationEventId(),
        name: "studio_operation_success",
        payload: {
          operation,
          query: toOperationQuery(query),
        },
        timestamp: new Date().toISOString(),
      });
    };

    const emitError = (operation: string, error: unknown, query?: unknown) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      handleOperationEvent({
        eventId: createOperationEventId(),
        name: "studio_operation_error",
        payload: {
          error: toOperationError(error),
          operation,
          query: toOperationQuery(query),
        },
        timestamp: new Date().toISOString(),
      });
    };

    return {
      ...adapter,
      introspect: async (args) => {
        const response = await adapter.introspect(args);
        const [error, result] = response;

        if (error) {
          emitError("introspect", error, (error as { query?: unknown }).query);
          return response;
        }

        emitSuccess("introspect", (result as { query?: unknown } | undefined)?.query);
        return response;
      },
      query: async (args, options) => {
        const response = await adapter.query(args, options);
        const [error, result] = response;

        if (error) {
          emitError("query", error, (error as { query?: unknown }).query);
          return response;
        }

        emitSuccess("query", (result as { query?: unknown } | undefined)?.query);
        return response;
      },
      update: async (args, options) => {
        const response = await adapter.update(args, options);
        const [error, result] = response;

        if (error) {
          emitError("update", error, (error as { query?: unknown }).query);
          return response;
        }

        emitSuccess("update", (result as { query?: unknown } | undefined)?.query);
        return response;
      },
    };
  }, [adapter, handleOperationEvent]);

  useEffect(() => {
    const applyFromHash = () => {
      const parsed = parseStudioHash(window.location.hash);
      const fallbackView = initialView;
      const hashView = parsed.viewParam;
      setSchema(parsed.schemaParam);
      setTable(parsed.tableParam);
      setSelectedView(
        hasStudioHashView(window.location.hash) && availableViewSet.has(hashView)
          ? hashView
          : fallbackView,
      );
      setPinnedColumns(parsed.pinnedColumnsParam);
      setSortOrder(parsed.sortOrderParam);
    };

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);

    return () => {
      window.removeEventListener("hashchange", applyFromHash);
    };
  }, [availableViewSet, initialView]);

  useEffect(() => {
    let isDisposed = false;
    const abortController = new AbortController();

    async function introspect() {
      setIsIntrospecting(true);

      const [error, result] = await instrumentedAdapter.introspect({
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
  }, [instrumentedAdapter, introspectionRetryToken]);

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
      : instrumentedAdapter.defaultSchema && introspection.schemas[instrumentedAdapter.defaultSchema]
        ? instrumentedAdapter.defaultSchema
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
  }, [instrumentedAdapter.defaultSchema, introspection, schema, table]);

  useEffect(() => {
    const nextHash = createStudioHash({
      pinnedColumnsParam: pinnedColumns,
      schemaParam: schema,
      sortOrderParam: sortOrder,
      tableParam: table,
      viewParam: selectedView,
    });

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [pinnedColumns, schema, selectedView, sortOrder, table]);

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

  const startupIntrospectionError = useMemo(() => {
    if (!introspectionNotice || isIntrospecting) {
      return null;
    }

    if (tableNames.length > 0) {
      return null;
    }

    return introspectionNotice;
  }, [introspectionNotice, isIntrospecting, tableNames.length]);

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

  if (!instrumentedAdapter) {
    return <div>Error: No adapter provided</div>;
  }

  const containerClasses = cn("relative flex flex-col w-full h-full min-h-0 font-sans");

  return (
    <div className="ps h-full w-full" style={studioStyle}>
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
              sectionDefinitions={availableSections}
              selectedView={selectedView}
              tableNames={tableNames}
            />
            <div className="flex flex-1 min-w-0 h-full min-h-0 overflow-hidden bg-background">
              <div className="flex-1 min-w-0 min-h-0">
                <StudioContent
                  activeTable={activeTable}
                  adapter={instrumentedAdapter}
                  isNavigationOpen={isNavigationOpen}
                  isIntrospecting={isIntrospecting}
                  operationEvents={operationEvents}
                  pinnedColumns={pinnedColumns}
                  sortOrder={sortOrder}
                  onOperationEvent={handleOperationEvent}
                  onPinnedColumnsChange={setPinnedColumns}
                  onSortOrderChange={setSortOrder}
                  onSelectTable={setTable}
                  onToggleNavigation={() => setIsNavigationOpen((current) => !current)}
                  onSelectView={setSelectedView}
                  schemaTables={schemaTables}
                  schema={schema}
                  selectedView={selectedView}
                  startupIntrospectionError={startupIntrospectionError}
                  onRetryIntrospection={retryIntrospection}
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
