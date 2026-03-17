import { Studio } from "@enhanced-prisma-studio/studio-core/ui";
import { useMemo } from "react";

import "@enhanced-prisma-studio/studio-core/ui/index.css";

import { Card, CardContent } from "@/components/ui/card";
import type { StudioThemeInput } from "@/components/prisma/types";
import { createPrismaStudioAdapter } from "@/components/prisma/utils/adapter";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function PrismaStudioScreen(props: { theme?: StudioThemeInput }) {
  const { theme } = props;

  const adapter = useMemo(() => {
    return createPrismaStudioAdapter({ executeStudioRequest });
  }, []);

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden p-4">
      <h1 className="pb-3 text-xl font-semibold tracking-tight">Studio (Baseline)</h1>
      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="h-full min-h-0 p-0">
          <Studio adapter={adapter} theme={theme} />
        </CardContent>
      </Card>
    </div>
  );
}
