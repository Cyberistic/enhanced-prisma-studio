import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { IconSearch, IconTable } from "@/components/prisma/icons";
import { IntrospectionStatusNotice } from "./introspection-status-notice";
import { useNavigationKeyboardNav } from "./hooks/use-navigation-keyboard-nav";
import { useNavigationTableList } from "./hooks/use-navigation-table-list";
import { useNavigationTableSearch } from "./hooks/use-navigation-table-search";
import type { StudioView } from "./types";

function PrismaLogo(props: { className?: string }) {
  return (
    <svg
      width="12"
      height="14"
      viewBox="0 0 12 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.396923 8.8719C0.25789 9.09869 0.260041 9.38484 0.402469 9.60951L2.98037 13.6761C3.14768 13.94 3.47018 14.0603 3.76949 13.9705L11.2087 11.7388C11.6147 11.617 11.8189 11.1641 11.6415 10.7792L6.8592 0.405309C6.62598 -0.100601 5.92291 -0.142128 5.63176 0.332808L0.396923 8.8719ZM6.73214 2.77688C6.6305 2.54169 6.2863 2.57792 6.23585 2.82912L4.3947 11.9965C4.35588 12.1898 4.53686 12.3549 4.72578 12.2985L9.86568 10.7642C10.0157 10.7194 10.093 10.5537 10.0309 10.41L6.73214 2.77688Z"
        fill="currentColor"
      />
    </svg>
  );
}

type NavigationProps = {
  className?: string;
  activeTable: string | null;
  introspectionError: {
    message: string;
    queryPreview: string | null;
    source: string;
  } | null;
  isIntrospecting?: boolean;
  onOpenSearch: () => void;
  onRetryIntrospection?: () => void;
  onSchemaChange: (schema: string) => void;
  onSelectTable: (table: string) => void;
  onSelectView: (view: StudioView) => void;
  schema: string;
  schemas: readonly string[];
  selectedView: StudioView;
  tableNames?: readonly string[];
};

const sidebarItemClassName =
  "w-full cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1 text-left font-mono text-xs text-foreground/60 transition-all hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground";

export function Navigation(props: NavigationProps) {
  const {
    activeTable,
    className,
    introspectionError = null,
    isIntrospecting = false,
    onOpenSearch,
    onRetryIntrospection = () => {},
    onSchemaChange,
    onSelectTable,
    onSelectView,
    schema,
    schemas = [],
    selectedView,
    tableNames = [],
  } = props;
  const {
    closeSearch,
    isSearchOpen,
    openSearch,
    searchInputRef,
    searchTerm,
    setSearchTerm,
  } = useNavigationTableSearch({ onOpenSearch });

  const { isSearchActive, tables } = useNavigationTableList({
    schema,
    searchTerm,
    tableNames,
  });

  const hasStartupIntrospectionFailure =
    introspectionError != null && tableNames.length === 0;
  const hasRecoverableIntrospectionWarning =
    introspectionError != null && tableNames.length > 0;

  function selectTable(tableName: string) {
    onSelectTable(tableName);
    onSelectView("table");
    closeSearch();
  }

  const { highlightedTableIndex, onSearchKeyDown, onTableMouseEnter } =
    useNavigationKeyboardNav({
      activeTable,
      isSearchOpen,
      onCloseSearch: closeSearch,
      onSelectTable: selectTable,
      tables,
    });

  return (
      <Sidebar
        collapsible="offcanvas"
        variant="sidebar"
        className={cn(
          "rounded-l-lg border-r border-border bg-background md:!absolute md:!inset-y-0 md:!h-full md:!max-h-full",
          className,
        )}
      >
      <SidebarHeader className="px-4 pt-4 pb-0.5">
        <div className="flex items-center gap-2">
          <PrismaLogo className="h-6 w-auto text-foreground/90" />
          <span className="text-lg font-medium font-sans whitespace-nowrap">Prisma Studio</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
      <SidebarGroup className="px-4 pt-4 pb-2">

        <Select
          value={schema}
          onValueChange={(nextSchema) => {
            if (!nextSchema) {
              return;
            }

            onSchemaChange(nextSchema);
          }}
        >
          <SelectTrigger className="w-full text-xs" size="sm">
            <SelectValue placeholder="Select schema" />
          </SelectTrigger>
          <SelectContent>
            {schemas.map((schemaName) => (
              <SelectItem key={schemaName} value={schemaName} className="text-xs">
                {schemaName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarGroup>

      <SidebarGroup className="px-2 pb-3 pt-4">
        <SidebarGroupLabel className="px-2 py-1 text-sm font-medium text-foreground">
          <div className="flex items-center gap-1">
            <IconTable size={16} className="text-muted-foreground/60" />
            <span>Studio</span>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent className="flex flex-col gap-px px-2 pb-3">
        <button
          type="button"
          data-active={selectedView === "schema" ? "true" : "false"}
          className={sidebarItemClassName}
          onClick={() => onSelectView("schema")}
        >
          Visualizer
        </button>
        <button
          type="button"
          data-active={selectedView === "console" ? "true" : "false"}
          className={sidebarItemClassName}
          onClick={() => onSelectView("console")}
        >
          Console
        </button>
        <button
          type="button"
          data-active={selectedView === "sql" ? "true" : "false"}
          className={sidebarItemClassName}
          onClick={() => onSelectView("sql")}
        >
          SQL
        </button>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="group/tables relative px-2 pb-3" data-search-open={isSearchOpen ? "true" : "false"}>
        <div className="flex items-center gap-1 pt-4 pb-2 px-4 sticky top-0 backdrop-blur-sm min-h-10">
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity duration-200",
              isSearchOpen && "opacity-0 pointer-events-none",
            )}
          >
            <IconTable size={16} className="text-muted-foreground/60" />
            <h2 className="text-sm font-medium">Tables</h2>
          </div>

          <button
            aria-label="Search tables"
            className={cn(
              "ml-auto h-6 w-6 rounded-sm flex items-center justify-center text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity duration-200",
              isSearchOpen
                ? "opacity-0 pointer-events-none"
                : "opacity-0 group-hover/tables:opacity-100 focus:opacity-100 focus-visible:opacity-100",
            )}
            onClick={openSearch}
            type="button"
          >
            <IconSearch size={14} />
          </button>

          <div
            data-table-search-input-wrapper
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 origin-right transition-[opacity,transform] duration-200 ease-out will-change-transform w-[calc(100%-2rem)]",
              isSearchOpen
                ? "opacity-100 scale-x-100"
                : "opacity-0 scale-x-0 pointer-events-none",
            )}
          >
            <Input
              aria-label="Search tables"
              className="h-9 w-full bg-background shadow-none"
              placeholder="Search tables..."
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              onKeyDown={onSearchKeyDown}
              onBlur={(event) => {
                if (event.currentTarget.value.trim().length > 0) {
                  return;
                }

                closeSearch();
              }}
            />
          </div>
        </div>

        {hasStartupIntrospectionFailure ? (
          <div className="px-2 pb-2">
            <IntrospectionStatusNotice
              compact
              description="Studio could not introspect the database."
              isRetrying={isIntrospecting}
              message={introspectionError?.message}
              onRetry={onRetryIntrospection}
              queryPreview={introspectionError?.queryPreview ?? null}
              source={introspectionError?.source ?? "unknown"}
              title="Introspection failed"
              variant="error"
            />
          </div>
        ) : null}

        {hasRecoverableIntrospectionWarning ? (
          <div className="px-2 pb-2">
            <IntrospectionStatusNotice
              compact
              description="Using last known schema metadata."
              isRetrying={isIntrospecting}
              message={introspectionError?.message}
              onRetry={onRetryIntrospection}
              queryPreview={introspectionError?.queryPreview ?? null}
              source={introspectionError?.source ?? "unknown"}
              title="Introspection warning"
              variant="warning"
            />
          </div>
        ) : null}

        <nav aria-label="Tables" className="flex flex-col gap-px pb-3 p-2">
          {tables.map((tableItem, index) => {
            const isHighlighted = isSearchOpen && index === highlightedTableIndex;
            const isCurrentTable = activeTable === tableItem.table && selectedView === "table";

            return (
              <button
                key={tableItem.id}
                type="button"
                className={sidebarItemClassName}
                data-active={isSearchOpen ? (isHighlighted ? "true" : "false") : isCurrentTable ? "true" : "false"}
                onMouseEnter={() => onTableMouseEnter(index)}
                onClick={() => selectTable(tableItem.table)}
              >
                {tableItem.table}
              </button>
            );
          })}
          {tables.length === 0 ? (
            <span className="py-1 px-2 font-mono text-xs text-muted-foreground">
              {isIntrospecting
                ? "Loading tables..."
                : isSearchActive
                  ? "No matching tables"
                  : "No tables found"}
            </span>
          ) : null}
        </nav>
      </SidebarGroup>
      </SidebarContent>
      </Sidebar>
  );
}
