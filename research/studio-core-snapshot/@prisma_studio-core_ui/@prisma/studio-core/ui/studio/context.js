import { createCollection, localOnlyCollectionOptions, localStorageCollectionOptions, useLiveQuery, } from "@tanstack/react-db";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, } from "react";
import { toast } from "sonner";
import { hasWindow, isCI } from "std-env";
import { check } from "../../checkpoint";
import { Toaster } from "../components/ui/sonner";
import { createUrl, NavigationContextProvider } from "../hooks/use-navigation";
import { CustomTheme, useTheme } from "../hooks/use-theme";
import shortUUID from "../lib/short-uuid";
import { NuqsHashAdapter } from "./NuqsHashAdapter";
import { StudioEvent, StudioEventBase, StudioOperationEvent } from "./Studio";
import { instrumentTanStackCollectionMutations } from "./tanstack-db-mutation-guard";
const STUDIO_UI_STATE_ID = "studio-ui-state";
const STUDIO_UI_STORAGE_KEY = "prisma-studio-ui-state-v1";
const SQL_EDITOR_STATE_ID = "studio-sql-editor-state";
const SQL_EDITOR_STORAGE_KEY = "prisma-studio-sql-editor-state-v1";
const DEFAULT_TABLE_PAGE_SIZE = 25;
function hasCleanup(value) {
    return typeof value === "object" && value !== null && "cleanup" in value;
}
function getDefaultStudioUiState() {
    return {
        id: STUDIO_UI_STATE_ID,
        isNavigationOpen: true,
        isDarkMode: typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark"),
        tablePageSize: DEFAULT_TABLE_PAGE_SIZE,
        isInfiniteScrollEnabled: false,
    };
}
function normalizeTablePageSize(pageSize) {
    if (typeof pageSize === "number" &&
        Number.isInteger(pageSize) &&
        Number.isSafeInteger(pageSize) &&
        pageSize > 0) {
        return pageSize;
    }
    return DEFAULT_TABLE_PAGE_SIZE;
}
function normalizeStudioUiState(state) {
    const defaults = getDefaultStudioUiState();
    return {
        ...defaults,
        ...state,
        tablePageSize: normalizeTablePageSize(state?.tablePageSize),
        isInfiniteScrollEnabled: state?.isInfiniteScrollEnabled ?? false,
    };
}
/**
 * Context for sharing Studio state across components
 */
const StudioContext = createContext(undefined);
export function StudioContextProvider(props) {
    const { children, onEvent: emitEvent, adapter, aiFilter, theme } = props;
    const queryClientRef = useRef(new QueryClient());
    const signatureRef = useRef(shortUUID.generate());
    const rowsCollectionCacheRef = useRef(new Map());
    const studioUiCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localStorageCollectionOptions({
        id: STUDIO_UI_STATE_ID,
        storageKey: STUDIO_UI_STORAGE_KEY,
        getKey(item) {
            return item.id;
        },
    })), { collectionName: "studio-ui-state" }));
    const operationEventsCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
        id: "studio-operation-events",
        getKey(item) {
            return item.eventId;
        },
        initialData: [],
    })), { collectionName: "studio-operation-events" }));
    const tableUiStateCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
        id: "studio-table-ui-state",
        getKey(item) {
            return item.id;
        },
        initialData: [],
    })), { collectionName: "studio-table-ui-state" }));
    const tableQueryMetaCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
        id: "studio-table-query-meta",
        getKey(item) {
            return item.id;
        },
        initialData: [],
    })), { collectionName: "studio-table-query-meta" }));
    const uiLocalStateCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
        id: "studio-local-ui-state",
        getKey(item) {
            return item.id;
        },
        initialData: [],
    })), { collectionName: "studio-local-ui-state" }));
    const sqlEditorStateCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localStorageCollectionOptions({
        id: SQL_EDITOR_STATE_ID,
        storageKey: SQL_EDITOR_STORAGE_KEY,
        getKey(item) {
            return item.id;
        },
    })), { collectionName: "studio-sql-editor-state" }));
    const navigationTableNamesCollectionRef = useRef(instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
        id: "studio-navigation-table-names",
        getKey(item) {
            return item.id;
        },
        initialData: [],
    })), { collectionName: "studio-navigation-table-names" }));
    const queryClient = queryClientRef.current;
    const studioUiCollection = studioUiCollectionRef.current;
    const operationEventsCollection = operationEventsCollectionRef.current;
    const tableUiStateCollection = tableUiStateCollectionRef.current;
    const tableQueryMetaCollection = tableQueryMetaCollectionRef.current;
    const uiLocalStateCollection = uiLocalStateCollectionRef.current;
    const sqlEditorStateCollection = sqlEditorStateCollectionRef.current;
    const navigationTableNamesCollection = navigationTableNamesCollectionRef.current;
    const { data: studioUiRows = [] } = useLiveQuery(studioUiCollection);
    const { data: operationEventsRows = [] } = useLiveQuery(operationEventsCollection);
    const studioUiState = normalizeStudioUiState(studioUiRows.find((item) => item.id === STUDIO_UI_STATE_ID));
    const operationEvents = useMemo(() => [...operationEventsRows].sort((left, right) => new Date(left.timestamp).getTime() -
        new Date(right.timestamp).getTime()), [operationEventsRows]);
    const updateStudioUiState = useCallback((updater) => {
        const existingState = studioUiCollection.get(STUDIO_UI_STATE_ID);
        if (!existingState) {
            const nextState = getDefaultStudioUiState();
            updater(nextState);
            studioUiCollection.insert(nextState);
            return;
        }
        studioUiCollection.update(STUDIO_UI_STATE_ID, updater);
    }, [studioUiCollection]);
    const getOrCreateRowsCollection = useCallback((key, factory) => {
        const existingCollection = rowsCollectionCacheRef.current.get(key);
        if (existingCollection != null) {
            return existingCollection;
        }
        const newCollection = instrumentTanStackCollectionMutations(factory(), {
            collectionName: `rows:${key}`,
        });
        rowsCollectionCacheRef.current.set(key, newCollection);
        return newCollection;
    }, []);
    const clearRowsCollections = useCallback(() => {
        for (const collection of rowsCollectionCacheRef.current.values()) {
            if (hasCleanup(collection) && typeof collection.cleanup === "function") {
                void collection.cleanup().catch((error) => {
                    console.error("Failed to cleanup cached rows collection", error);
                });
            }
        }
        rowsCollectionCacheRef.current.clear();
    }, []);
    // Ensure the persisted UI state row exists.
    useEffect(() => {
        if (studioUiCollection.has(STUDIO_UI_STATE_ID)) {
            return;
        }
        studioUiCollection.insert(getDefaultStudioUiState());
    }, [studioUiCollection]);
    useEffect(() => {
        // if the adapter has been changed, then we need to reload
        clearRowsCollections();
        void queryClient.resetQueries({ exact: false, queryKey: [] });
    }, [adapter, clearRowsCollections, queryClient]);
    // Watch for changes to the HTML element's class attribute.
    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }
        const syncDarkMode = () => {
            const hasDarkClass = document.documentElement.classList.contains("dark");
            if (studioUiCollection.get(STUDIO_UI_STATE_ID)?.isDarkMode === hasDarkClass) {
                return;
            }
            updateStudioUiState((draft) => {
                draft.isDarkMode = hasDarkClass;
            });
        };
        syncDarkMode();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" &&
                    mutation.attributeName === "class") {
                    syncDarkMode();
                    break;
                }
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, [studioUiCollection, updateStudioUiState]);
    // Use the theme hook to handle custom themes.
    const { hasCustomTheme } = useTheme(theme, studioUiState.isDarkMode);
    const onEvent = useCallback((event) => {
        const { name, payload } = event;
        // Always forward the raw error to the user as a toast.
        if (name === "studio_operation_error") {
            // These can be emitted by our tanstack infra.
            if (payload.error.name === "AbortError") {
                return;
            }
            toast.error(`"${payload.operation}" operation failed`, {
                action: {
                    label: "Console",
                    onClick: () => {
                        window.location.hash = createUrl({ viewParam: "console" });
                    },
                },
            });
        }
        const eventId = shortUUID.generate();
        const timestamp = new Date().toISOString();
        const enrichedEvent = {
            ...event,
            eventId,
            timestamp,
        };
        if (enrichedEvent.name === "studio_operation_success" ||
            enrichedEvent.name === "studio_operation_error") {
            operationEventsCollection.insert(enrichedEvent);
            const overflow = operationEventsCollection.size - 100;
            if (overflow > 0) {
                const staleEvents = [...operationEventsCollection.toArray]
                    .sort((left, right) => new Date(left.timestamp).getTime() -
                    new Date(right.timestamp).getTime())
                    .slice(0, overflow)
                    .map((event) => event.eventId);
                if (staleEvents.length > 0) {
                    operationEventsCollection.delete(staleEvents);
                }
            }
        }
        emitEvent?.(enrichedEvent);
        // TODO: allow to opt-out in the future, on certain pricing plans.
        // TODO: unblock for all events in the future.
        if (name === "studio_launched" &&
            hasWindow &&
            !isCI &&
            !isPrismaVSCodeExtension() &&
            !isPrismaPlatform()) {
            void check({
                additionalData: {
                    eventPayload: payload,
                    variant: "free",
                },
                command: name,
                eventId,
                product: "prisma-studio-embedded",
                signature: signatureRef.current,
                skipUpdateCheck: true,
                timestamp: new Date(timestamp),
                version: VERSION_INJECTED_AT_BUILD_TIME,
            }).catch((error) => {
                console.error(error);
            });
        }
    }, [emitEvent, operationEventsCollection]);
    const toggleNavigation = useCallback(() => {
        updateStudioUiState((draft) => {
            draft.isNavigationOpen = !draft.isNavigationOpen;
        });
    }, [updateStudioUiState]);
    const setTablePageSize = useCallback((pageSize) => {
        const normalizedPageSize = normalizeTablePageSize(pageSize);
        updateStudioUiState((draft) => {
            draft.tablePageSize = normalizedPageSize;
        });
    }, [updateStudioUiState]);
    const setInfiniteScrollEnabled = useCallback((enabled) => {
        updateStudioUiState((draft) => {
            draft.isInfiniteScrollEnabled = enabled;
        });
    }, [updateStudioUiState]);
    return (<QueryClientProvider client={queryClient}>
      <Toaster />
      <StudioContext.Provider value={{
            adapter,
            aiFilter,
            onEvent,
            operationEvents,
            isNavigationOpen: studioUiState.isNavigationOpen,
            toggleNavigation,
            isDarkMode: studioUiState.isDarkMode,
            tablePageSize: studioUiState.tablePageSize,
            setTablePageSize,
            isInfiniteScrollEnabled: studioUiState.isInfiniteScrollEnabled,
            setInfiniteScrollEnabled,
            hasCustomTheme,
            queryClient,
            tableUiStateCollection,
            tableQueryMetaCollection,
            uiLocalStateCollection,
            sqlEditorStateCollection,
            navigationTableNamesCollection,
            getOrCreateRowsCollection,
        }}>
        <NuqsHashAdapter>
          <NavigationContextProvider>{children}</NavigationContextProvider>
        </NuqsHashAdapter>
      </StudioContext.Provider>
    </QueryClientProvider>);
}
export function useOptionalStudio() {
    return useContext(StudioContext);
}
/**
 * Hook to access Studio context
 * @throws Error if used outside of Studio.Provider
 */
export function useStudio() {
    const context = useOptionalStudio();
    if (!context) {
        throw new Error("`useStudio` must be used within a `StudioContext.Provider`");
    }
    return context;
}
function isPrismaVSCodeExtension() {
    return (isVSCodeExtension() && "__PVCE__" in window && window.__PVCE__ === true);
}
function isVSCodeExtension() {
    return (hasWindow &&
        "acquireVsCodeApi" in window &&
        typeof window.acquireVsCodeApi === "function");
}
function isPrismaPlatform() {
    if (!hasWindow) {
        return false;
    }
    const { hostname } = window.location;
    return (("__PDPCP__" in window && window.__PDPCP__ === true) ||
        hostname.includes("console.prisma.io") ||
        hostname.includes("datacdn.workers.dev"));
}
