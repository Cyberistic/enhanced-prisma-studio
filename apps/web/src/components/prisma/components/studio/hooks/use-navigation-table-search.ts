import { useCallback, useEffect, useRef, useState } from "react";

type NavigationTableSearchState = {
  isOpen: boolean;
  term: string;
};

export function useNavigationTableSearch(args: { onOpenSearch: () => void }) {
  const { onOpenSearch } = args;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<NavigationTableSearchState>({
    isOpen: false,
    term: "",
  });

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }

    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [state.isOpen]);

  const openSearch = useCallback(() => {
    setState((previousState) => ({
      ...previousState,
      isOpen: true,
    }));
    onOpenSearch();
  }, [onOpenSearch]);

  const closeSearch = useCallback(() => {
    setState({
      isOpen: false,
      term: "",
    });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState((previousState) => ({
      ...previousState,
      term,
    }));
  }, []);

  return {
    closeSearch,
    isSearchOpen: state.isOpen,
    openSearch,
    searchInputRef,
    searchTerm: state.term,
    setSearchTerm,
  };
}
