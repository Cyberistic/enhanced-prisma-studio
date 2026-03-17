import { createFileRoute } from "@tanstack/react-router";

import { StudioScreen } from "@/components/studio-screen";

import "@enhanced-prisma-studio/studio-core/ui/index.css";

export const Route = createFileRoute("/studio")({
  component: StudioRouteComponent,
});

function StudioRouteComponent() {
  return <StudioScreen />;
}
