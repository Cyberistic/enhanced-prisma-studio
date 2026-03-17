export type StudioView = "table" | "schema" | "console" | "sql";

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
