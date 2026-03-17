import {
  studioTelemetryEnabled,
  toStudioTelemetryPayload,
  trackStudioTelemetry,
} from "@/lib/studio-telemetry";

import type { StudioEvent } from "../types";

export function createStudioEventHandler(source: "enhanced" | "prisma") {
  if (!studioTelemetryEnabled) {
    return undefined;
  }

  return (event: StudioEvent) => {
    void trackStudioTelemetry({
      data: toStudioTelemetryPayload(source, event),
    });
  };
}
