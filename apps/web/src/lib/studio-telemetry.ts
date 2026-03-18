import { createServerFn } from "@tanstack/react-start";

export type StudioTelemetrySource = "prisma" | "enhanced";

export type StudioTelemetryPayload = {
  source: StudioTelemetrySource;
  eventName: string;
  operation?: string;
  hasError: boolean;
};

type StudioEventLike = {
  name: string;
  payload?: unknown;
};

export const studioTelemetryEnabled = import.meta.env.VITE_PRISMA_TELEMETRY_DISABLED !== "1";

export function toStudioTelemetryPayload(
  source: StudioTelemetrySource,
  event: StudioEventLike,
): StudioTelemetryPayload {
  let operation: string | undefined;

  if (event.payload && typeof event.payload === "object") {
    const operationValue = (event.payload as { operation?: unknown }).operation;
    if (typeof operationValue === "string") {
      operation = operationValue;
    }
  }

  return {
    source,
    eventName: event.name,
    operation,
    hasError: event.name === "studio_operation_error",
  };
}

export const trackStudioTelemetry = createServerFn({ method: "POST" })
  .inputValidator((payload: StudioTelemetryPayload) => payload)
  .handler(async ({ data }) => {
    if (process.env.VITE_PRISMA_TELEMETRY_DISABLED === "1") {
      return { tracked: false } as const;
    }

    console.info("[studio-telemetry]", {
      source: data.source,
      eventName: data.eventName,
      operation: data.operation ?? null,
      hasError: data.hasError,
    });

    return { tracked: true } as const;
  });
