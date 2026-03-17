import {
  AlertCircle,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Search,
  Square,
  Table2,
  type LucideProps,
} from "lucide-react";
export type IconProps = LucideProps;

export function IconSearch(props: IconProps) {
  return <Search {...props} />;
}

export function IconTable(props: IconProps) {
  return <Table2 {...props} />;
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
