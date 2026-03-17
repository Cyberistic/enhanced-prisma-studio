import { useEffect, useMemo, useState } from "react";

import { StudioShell } from "./components/studio/studio";
import type { StudioThemeInput } from "./types";
import { createPrismaStudioAdapter } from "./utils/adapter";
import { executeStudioRequest } from "./utils/studio-request";

export function PrismaStudio(props: { theme?: StudioThemeInput }) {
  const { theme } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const adapter = useMemo(() => {
    return createPrismaStudioAdapter({ executeStudioRequest });
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden bg-background p-4 text-foreground">
      {mounted ? (
        <StudioShell adapter={adapter} theme={theme} />
      ) : (
        <div className="flex h-full items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          Loading Studio...
        </div>
      )}
    </div>
  );
}
