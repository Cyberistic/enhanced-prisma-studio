import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { IconPanelLeftClose, IconPanelLeftOpen } from "@/components/prisma/icons";

interface StudioHeaderProps {
  children?: React.ReactNode;
  className?: string;
  endContent?: React.ReactNode;
  isNavigationOpen: boolean;
  onToggleNavigation: () => void;
}

export function StudioHeader(props: StudioHeaderProps) {
  const { children, className, endContent, isNavigationOpen, onToggleNavigation } = props;

  return (
    <div
      className={cn(
        "bg-studio-header-background flex w-full rounded-t-lg border-b border-border bg-card p-2 py-3",
        className,
      )}
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 grow items-center gap-2">
          <Button
            aria-label={isNavigationOpen ? "Close navigation" : "Open navigation"}
            variant="outline"
            size="icon"
            onClick={onToggleNavigation}
          >
            {isNavigationOpen ? (
              <IconPanelLeftClose data-icon="inline-start" />
            ) : (
              <IconPanelLeftOpen data-icon="inline-start" />
            )}
          </Button>
          {children}
        </div>

        {endContent != null ? (
          <div
            data-testid="studio-header-end-controls"
            className="flex shrink-0 items-center gap-2 pl-2"
          >
            {endContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
