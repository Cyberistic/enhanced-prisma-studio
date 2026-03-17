import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { IconSearch, IconTable } from "./icons";
import type { ForkedStudioView } from "./types";

type NavigationProps = {
  className?: string;
  activeTable: string | null;
  isOpen: boolean;
  onOpenSearch: () => void;
  onSchemaChange: (schema: string) => void;
  onSelectTable: (table: string) => void;
  onSelectView: (view: ForkedStudioView) => void;
  schema: string;
  schemas: readonly string[];
  selectedView: ForkedStudioView;
};

const mockTables = ["User", "Todo", "Project", "Task"];

export function Navigation(props: NavigationProps) {
  const {
    activeTable,
    className,
    isOpen,
    onOpenSearch,
    onSchemaChange,
    onSelectTable,
    onSelectView,
    schema,
    schemas,
    selectedView,
  } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedTableIndex, setHighlightedTableIndex] = useState(-1);

  const tables = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return mockTables;
    }

    return mockTables.filter((tableName) => tableName.toLowerCase().includes(normalized));
  }, [searchTerm]);

  useEffect(() => {
    if (!isSearchOpen) {
      setHighlightedTableIndex(-1);
      return;
    }

    const activeIndex = activeTable ? tables.indexOf(activeTable) : -1;
    setHighlightedTableIndex(activeIndex >= 0 ? activeIndex : tables.length > 0 ? 0 : -1);
  }, [activeTable, isSearchOpen, tables]);

  function openTableSearch() {
    setIsSearchOpen(true);
    onOpenSearch();
  }

  function closeTableSearch() {
    setIsSearchOpen(false);
    setSearchTerm("");
    setHighlightedTableIndex(-1);
  }

  function selectTable(tableName: string) {
    onSelectTable(tableName);
    onSelectView("table");
    closeTableSearch();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTableSearch();
      return;
    }

    if (tables.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedTableIndex((current) => {
        if (current < 0) {
          return 0;
        }

        return Math.min(current + 1, tables.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedTableIndex((current) => {
        if (current < 0) {
          return tables.length - 1;
        }

        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Enter" && highlightedTableIndex >= 0) {
      event.preventDefault();
      const selectedTable = tables[highlightedTableIndex];
      if (!selectedTable) {
        return;
      }

      selectTable(selectedTable);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col w-56 overflow-y-auto min-h-full h-0 text-card-foreground shadow-xs rounded-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 pt-4 pb-0.5 px-4">
        <span className="text-lg font-medium font-sans">Prisma Studio</span>
      </div>

      <div className="flex items-center gap-1 pt-4 pb-2 px-4 sticky top-0 backdrop-blur-sm">
        <Select
          value={schema}
          onValueChange={(nextSchema) => {
            if (!nextSchema) {
              return;
            }

            onSchemaChange(nextSchema);
          }}
        >
          <SelectTrigger className="text-xs w-full" size="sm">
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
      </div>

      <div className="group/tables relative" data-search-open={isSearchOpen ? "true" : "false"}>
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
            onClick={openTableSearch}
            type="button"
          >
            <IconSearch size={14} />
          </button>
        </div>

        <div
          className={cn(
            "px-2 pb-2 transition-[opacity,transform] duration-200 ease-out",
            isSearchOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none h-0 p-0",
          )}
        >
          <Input
            aria-label="Search tables"
            placeholder="Search tables..."
            autoFocus={isSearchOpen}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={handleSearchKeyDown}
            onBlur={(event) => {
              if (event.currentTarget.value.trim().length > 0) {
                return;
              }

              closeTableSearch();
            }}
          />
        </div>

        <nav aria-label="Tables" className="flex flex-col gap-px pb-3 p-2">
          {tables.map((tableName, index) => {
            const isHighlighted = isSearchOpen && index === highlightedTableIndex;
            const isCurrentTable = activeTable === tableName && selectedView === "table";

            return (
              <button
                key={tableName}
                type="button"
                className="py-1 px-2 text-left font-mono text-xs text-foreground/60 hover:text-foreground rounded-md hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground"
                data-active={isSearchOpen ? (isHighlighted ? "true" : "false") : isCurrentTable ? "true" : "false"}
                onMouseEnter={() => {
                  if (!isSearchOpen) {
                    return;
                  }

                  setHighlightedTableIndex(index);
                }}
                onClick={() => selectTable(tableName)}
              >
                {tableName}
              </button>
            );
          })}
          {tables.length === 0 ? (
            <span className="py-1 px-2 font-mono text-xs text-muted-foreground">No matching tables</span>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-1 pt-4 pb-2 px-4 sticky top-0 backdrop-blur-sm">
        <IconTable size={16} className="text-muted-foreground/60" />
        <h2 className="text-sm font-medium">Studio</h2>
      </div>
      <div className="flex flex-col gap-1 p-2 pb-3">
        <Button variant={selectedView === "schema" ? "secondary" : "ghost"} size="sm" onClick={() => onSelectView("schema")}>Visualizer</Button>
        <Button variant={selectedView === "console" ? "secondary" : "ghost"} size="sm" onClick={() => onSelectView("console")}>Console</Button>
        <Button variant={selectedView === "sql" ? "secondary" : "ghost"} size="sm" onClick={() => onSelectView("sql")}>SQL</Button>
      </div>
    </div>
  );
}
