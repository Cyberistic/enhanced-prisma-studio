import { Children, isValidElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AdapterProvider } from "./providers/adapters/adapter-provider";
import type { StudioAdapter } from "./providers/adapters/types";
import { URLProvider } from "./providers/url/url-provider";
import type { URLProviderAdapter } from "./providers/url/types";
import { PrismaProviders } from "./components/prisma-providers";
import { PrismaStudioThemeProvider } from "./components/prisma-studio-context";
import type { StudioThemeInput } from "./types";

type PrismaStudioProps = {
  children: ReactNode;
  className?: string;
  theme?: StudioThemeInput;
};

export function PrismaStudio(props: PrismaStudioProps) {
  const { children, className, theme } = props;

  if (!children) {
    throw new Error(
      "PrismaStudio requires children-based composition. Add <PrismaProviders> and <PrismaStudioContent> as children.",
    );
  }

  // Extract adapters from a <PrismaProviders> child if present.
  let urlAdapter: URLProviderAdapter | null = null;
  let studioAdapter: StudioAdapter | null = null;
  const remaining: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      remaining.push(child);
      return;
    }

    if (child.type === PrismaProviders) {
      // Walk PrismaProviders' children to find provider markers.
      Children.forEach(
        (child.props as { children?: ReactNode }).children,
        (providerChild) => {
          if (!isValidElement(providerChild)) return;
          if (providerChild.type === URLProvider) {
            urlAdapter = (providerChild.props as { adapter: URLProviderAdapter }).adapter;
          } else if (providerChild.type === AdapterProvider) {
            studioAdapter = (providerChild.props as { adapter: StudioAdapter }).adapter;
          }
        },
      );
      return;
    }

    remaining.push(child);
  });

  let content = <>{remaining}</>;

  // If PrismaProviders was used, wrap remaining children in the context stack.
  if (urlAdapter !== null || studioAdapter !== null) {
    if (!urlAdapter) {
      throw new Error("PrismaProviders requires a <URLProvider adapter={...} /> child");
    }
    if (!studioAdapter) {
      throw new Error("PrismaProviders requires an <AdapterProvider adapter={...} /> child");
    }
    content = (
      <URLProvider adapter={urlAdapter}>
        <AdapterProvider adapter={studioAdapter}>
          {remaining}
        </AdapterProvider>
      </URLProvider>
    );
  }

  return (
    <PrismaStudioThemeProvider theme={theme}>
      <div className={cn("h-full min-h-0", className)}>{content}</div>
    </PrismaStudioThemeProvider>
  );
}

export { PrismaProviders } from "./components/prisma-providers";
export { AdapterProvider } from "./providers/adapters/adapter-provider";
export { URLProvider } from "./providers/url/url-provider";
export {
  PrismaConsole,
  PrismaLogs,
  PrismaSQL,
  PrismaStudioContent,
  PrismaStudioSection,
  PrismaStudioSectionHeader,
  PrismaTablesSearchHeader,
  PrismaTables,
  PrismaVisualizer,
} from "./components/prisma-studio-components";
