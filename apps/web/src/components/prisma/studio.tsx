import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PrismaStudioThemeProvider } from "./components/prisma-studio-context";
import type { StudioThemeInput } from "./types";

type PrismaStudioProps = {
  children: ReactNode;
  className?: string;
  theme?: StudioThemeInput;
};

/**
 * PrismaStudio Component
 *
 * Root composition component. Children are required.
 *
 * @example
 * <PrismaStudio theme="dark">
 *   <URLProvider adapter={createTanStackRouterAdapter()}>
 *     <AdapterProvider adapter={createPrismaStudioAdapter({ executeStudioRequest })}>
 *       <PrismaStudioContent>
 *         <PrismaStudioSection>
 *           <PrismaStudioSectionHeader>Studio</PrismaStudioSectionHeader>
 *           <PrismaTables />
 *         </PrismaStudioSection>
 *       </PrismaStudioContent>
 *     </AdapterProvider>
 *   </URLProvider>
 * </PrismaStudio>
 */
export function PrismaStudio(props: PrismaStudioProps) {
  const { children, className, theme } = props;

  if (!children) {
    throw new Error(
      "PrismaStudio requires children-based composition. Wrap URLProvider and AdapterProvider inside PrismaStudio and render PrismaStudioContent/Section components.",
    );
  }

  return (
    <PrismaStudioThemeProvider theme={theme}>
      <div className={cn("h-full min-h-0", className)}>{children}</div>
    </PrismaStudioThemeProvider>
  );
}

export {
  PrismaConsole,
  PrismaSQL,
  PrismaStudioContent,
  PrismaStudioSection,
  PrismaStudioSectionHeader,
  PrismaTablesSearchHeader,
  PrismaTables,
  PrismaVisualizer,
} from "./components/prisma-studio-components";
