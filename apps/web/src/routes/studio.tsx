import { createFileRoute } from "@tanstack/react-router";

import { PrismaStudioScreen } from "@/components/prisma-studio-screen";

import "@prisma/studio-core/ui/index.css";

export const Route = createFileRoute("/studio")({
  component: StudioRouteComponent,
});

function StudioRouteComponent() {
  return <PrismaStudioScreen />;
}
