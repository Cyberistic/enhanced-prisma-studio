import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { IconSearch, IconTable } from "@/components/prisma/icons";
import { cn } from "@/lib/utils";

import { useAdapter } from "../providers/adapters";
import { useURLProvider } from "../providers/url";
import { usePrismaStudioTheme } from "./prisma-studio-context";
import { StudioShell } from "./studio/studio";
import type {
  StudioSectionDefinition,
  StudioView,
  StudioViewDefinition,
} from "./studio/types";

type PrismaStudioLayoutProps = {
  children: ReactNode;
  className?: string;
};

type PrismaViewMarkerType = {
  __studioViewMarker?: {
    id: StudioView;
    label: string;
  };
};

type PrismaViewMarkerProps = {
  label?: string;
};

type PrismaSectionMarkerType = {
  __studioSectionMarker?: true;
};

type PrismaSectionHeaderMarkerType = {
  __studioSectionHeaderMarker?: true;
};

function collectViewDefinitions(node: ReactNode, definitions: StudioViewDefinition[]) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const markerType = child.type as PrismaViewMarkerType;
    const marker = markerType.__studioViewMarker;
    if (marker) {
      definitions.push({
        id: marker.id,
        label:
          typeof child.props === "object" &&
          child.props != null &&
          "label" in child.props &&
          typeof (child.props as PrismaViewMarkerProps).label === "string" &&
          (child.props as PrismaViewMarkerProps).label
            ? ((child.props as PrismaViewMarkerProps).label as string)
            : marker.label,
      });
      return;
    }

    if (typeof child.props === "object" && child.props != null && "children" in child.props) {
      collectViewDefinitions(child.props.children as ReactNode, definitions);
    }
  });
}

function dedupeViews(definitions: StudioViewDefinition[]) {
  const deduped = new Map<StudioView, StudioViewDefinition>();
  for (const definition of definitions) {
    deduped.set(definition.id, definition);
  }

  return Array.from(deduped.values());
}

function parseSection(
  sectionNode: ReactElement<{ children?: ReactNode }>,
  sectionIndex: number,
): StudioSectionDefinition {
  const definitions: StudioViewDefinition[] = [];
  let header: ReactNode = null;

  Children.forEach(sectionNode.props.children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return;
    }

    const sectionHeaderType = child.type as PrismaSectionHeaderMarkerType;
    if (sectionHeaderType.__studioSectionHeaderMarker) {
      header = child.props.children;
      return;
    }

    collectViewDefinitions(child, definitions);
  });

  return {
    header: header ?? undefined,
    id: `section-${sectionIndex}`,
    views: dedupeViews(definitions),
  };
}

function getSectionDefinitions(node: ReactNode): StudioSectionDefinition[] {
  const sections: StudioSectionDefinition[] = [];
  const fallbackDefinitions: StudioViewDefinition[] = [];

  Children.forEach(node, (child, childIndex) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return;
    }

    const sectionType = child.type as PrismaSectionMarkerType;
    if (sectionType.__studioSectionMarker) {
      sections.push(parseSection(child, childIndex));
      return;
    }

    collectViewDefinitions(child, fallbackDefinitions);
  });

  if (sections.length > 0) {
    return sections.filter((section) => section.views.length > 0);
  }

  const fallbackViews = dedupeViews(fallbackDefinitions);
  if (fallbackViews.length === 0) {
    return [];
  }

  return [{ id: "default", views: fallbackViews }];
}

export function PrismaStudioContent(props: PrismaStudioLayoutProps) {
  const { children, className } = props;
  const adapter = useAdapter();
  useURLProvider();
  const theme = usePrismaStudioTheme();
  const sectionDefinitions = getSectionDefinitions(children);

  if (sectionDefinitions.length === 0) {
    throw new Error(
      "PrismaStudioContent requires at least one view marker component (PrismaConsole, PrismaLogs, PrismaSQL, PrismaVisualizer, PrismaTables)",
    );
  }

  return (
    <div className={cn("h-full min-h-0", className)}>
      <StudioShell adapter={adapter} sectionDefinitions={sectionDefinitions} theme={theme} />
    </div>
  );
}

export function PrismaStudioSection(props: PrismaStudioLayoutProps) {
  const { children } = props;

  return <>{children}</>;
}

(PrismaStudioSection as PrismaSectionMarkerType).__studioSectionMarker = true;

export function PrismaStudioSectionHeader(props: PrismaStudioLayoutProps) {
  return <Fragment>{props.children}</Fragment>;
}

(PrismaStudioSectionHeader as PrismaSectionHeaderMarkerType).__studioSectionHeaderMarker = true;

type PrismaTablesSearchHeaderType = {
  __studioHandlesSearch?: boolean;
};

export function PrismaTablesSearchHeader(props: {
  className?: string;
  onSearch?: () => void;
}) {
  const { className, onSearch } = props;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconTable size={16} className="shrink-0 text-muted-foreground/60" />
      <span className="text-sm font-medium leading-none">Tables</span>
      <button
        type="button"
        aria-label="Search tables"
        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSearch?.()}
      >
        <IconSearch size={14} />
      </button>
    </div>
  );
}

(PrismaTablesSearchHeader as PrismaTablesSearchHeaderType).__studioHandlesSearch = true;

export function PrismaConsole(_props: PrismaViewMarkerProps) {
  return null;
}

(PrismaConsole as PrismaViewMarkerType).__studioViewMarker = {
  id: "console",
  label: "Console",
};

export function PrismaSQL(_props: PrismaViewMarkerProps) {
  return null;
}

(PrismaSQL as PrismaViewMarkerType).__studioViewMarker = {
  id: "sql",
  label: "SQL",
};

export function PrismaVisualizer(_props: PrismaViewMarkerProps) {
  return null;
}

(PrismaVisualizer as PrismaViewMarkerType).__studioViewMarker = {
  id: "schema",
  label: "Visualizer",
};

export function PrismaTables(_props: PrismaViewMarkerProps) {
  return null;
}

export function PrismaLogs(_props: PrismaViewMarkerProps) {
  return null;
}

(PrismaLogs as PrismaViewMarkerType).__studioViewMarker = {
  id: "logs",
  label: "Logs",
};

(PrismaTables as PrismaViewMarkerType).__studioViewMarker = {
  id: "table",
  label: "Tables",
};

export function PrismaEvilStats(_props: PrismaViewMarkerProps) {
  return null;
}

(PrismaEvilStats as PrismaViewMarkerType).__studioViewMarker = {
  id: "evil-stats",
  label: "Evil Stats",
};
