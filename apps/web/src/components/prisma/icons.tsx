import {
  AlertCircle,
  Key,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Search,
  Square,
  Table2,
  type LucideProps,
} from "lucide-react";

/**
 * Usage:
 * Import icons from this file (not directly from `lucide-react`) so the app can
 * switch icon libraries in one place.
 *
 * Example: replacing with HugeIcons
 * 1) Update imports in this file to HugeIcons React components.
 * 2) Keep exported wrapper names (`IconSearch`, `IconTable`, etc.) unchanged.
 * 3) Point each wrapper function to the matching HugeIcons component.
 *
 * Example: switch `IconSearch` to HugeIcons

 * import { HugeiconsIcon } from "@hugeicons/react";
 * import { Search01Icon } from "@hugeicons/core-free-icons";
 *
 * export function IconSearch(props: IconProps) {
 *   return <HugeiconsIcon icon={Search01Icon} {...props} />;
 * }

 *
 * Also update `IconProps` to match the HugeIcons component props type.
 
 */

export type IconProps = LucideProps;

export function IconSearch(props: IconProps) {
  return <Search {...props} />;
}

export function IconTable(props: IconProps) {
  return <Table2 {...props} />;
}

export function IconLayers(props: IconProps) {
  return <Layers {...props} />;
}

export function IconPanelLeftClose(props: IconProps) {
  return <PanelLeftClose {...props} />;
}

export function IconPanelLeftOpen(props: IconProps) {
  return <PanelLeftOpen {...props} />;
}

export function IconAlertCircle(props: IconProps) {
  return <AlertCircle {...props} />;
}

export function IconRefreshCw(props: IconProps) {
  return <RefreshCw {...props} />;
}

export function IconKey(props: IconProps) {
  return <Key {...props} />;
}

export function IconPlay(props: IconProps) {
  return <Play {...props} />;
}

export function IconSquare(props: IconProps) {
  return <Square {...props} />;
}
