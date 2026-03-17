import type { ReactNode } from "react";

export type StudioView = "table" | "schema" | "console" | "sql" | "evil-stats";

export type StudioViewDefinition = {
    id: StudioView;
    label: string;
};

export type StudioSectionDefinition = {
    id: string;
    header?: ReactNode;
    views: readonly StudioViewDefinition[];
};

export const DEFAULT_STUDIO_VIEW_DEFINITIONS: readonly StudioViewDefinition[] = [
    { id: "schema", label: "Visualizer" },
    { id: "console", label: "Console" },
    { id: "sql", label: "SQL" },
    { id: "table", label: "Tables" },
];

export type StudioOperationEventName =
    | "studio_operation_success"
    | "studio_operation_error";

export type StudioOperationEvent = {
    eventId: string;
    name: StudioOperationEventName;
    timestamp: string;
    payload: {
        operation: string;
        query?: {
            parameters?: unknown[];
            sql: string;
        };
        error?: {
            adapterSource?: string;
            message: string;
        };
    };
};
