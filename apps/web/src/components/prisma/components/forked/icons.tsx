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

export type ForkedIconProps = LucideProps;

export function IconSearch(props: ForkedIconProps) {
  return <Search {...props} />;
}

export function IconTable(props: ForkedIconProps) {
  return <Table2 {...props} />;
}

export function IconPanelLeftClose(props: ForkedIconProps) {
  return <PanelLeftClose {...props} />;
}

export function IconPanelLeftOpen(props: ForkedIconProps) {
  return <PanelLeftOpen {...props} />;
}

export function IconAlertCircle(props: ForkedIconProps) {
  return <AlertCircle {...props} />;
}

export function IconRefreshCw(props: ForkedIconProps) {
  return <RefreshCw {...props} />;
}

export function IconKey(props: ForkedIconProps) {
  return <Key {...props} />;
}

export function IconPlay(props: ForkedIconProps) {
  return <Play {...props} />;
}

export function IconSquare(props: ForkedIconProps) {
  return <Square {...props} />;
}