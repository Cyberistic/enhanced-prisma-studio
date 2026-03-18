import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

import type { NavigationTableItem } from "./use-navigation-table-list";

export function useNavigationKeyboardNav(args: {
  activeTable: string | null;
  isSearchOpen: boolean;
  onCloseSearch: () => void;
  onSelectTable: (tableName: string) => void;
  tables: readonly NavigationTableItem[];
}) {
  const { activeTable, isSearchOpen, onCloseSearch, onSelectTable, tables } = args;
  const [highlightedTableIndex, setHighlightedTableIndex] = useState(-1);

  useEffect(() => {
    if (!isSearchOpen) {
      setHighlightedTableIndex(-1);
      return;
    }

    const activeIndex = activeTable ? tables.findIndex((table) => table.table === activeTable) : -1;

    setHighlightedTableIndex(activeIndex >= 0 ? activeIndex : tables.length > 0 ? 0 : -1);
  }, [activeTable, isSearchOpen, tables]);

  const onSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseSearch();
        return;
      }

      if (tables.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedTableIndex((currentIndex) => {
          if (currentIndex < 0) {
            return 0;
          }

          return Math.min(currentIndex + 1, tables.length - 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedTableIndex((currentIndex) => {
          if (currentIndex < 0) {
            return tables.length - 1;
          }

          return Math.max(currentIndex - 1, 0);
        });
        return;
      }

      if (event.key === "Enter" && highlightedTableIndex >= 0) {
        event.preventDefault();
        const selectedTable = tables[highlightedTableIndex];
        if (!selectedTable) {
          return;
        }

        onSelectTable(selectedTable.table);
      }
    },
    [highlightedTableIndex, onCloseSearch, onSelectTable, tables],
  );

  const onTableMouseEnter = useCallback(
    (index: number) => {
      if (!isSearchOpen) {
        return;
      }

      setHighlightedTableIndex(index);
    },
    [isSearchOpen],
  );

  return {
    highlightedTableIndex,
    onSearchKeyDown,
    onTableMouseEnter,
  };
}
