import { createFileRoute } from "@tanstack/react-router";

import { PrismaStudioScreen } from "../components/prisma-studio-screen";

export const Route = createFileRoute("/studio")({
  component: StudioRouteComponent,
});

function StudioRouteComponent() {
  return <PrismaStudioScreen />;
}
