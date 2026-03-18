import { IconLayers } from "@/components/prisma/icons";

export function StudioSectionHeader() {
  return (
    <div className="flex items-center gap-1">
      <IconLayers size={16} className="shrink-0 text-muted-foreground/60" />
      <span className="text-sm font-medium leading-none">Studio</span>
    </div>
  );
}
