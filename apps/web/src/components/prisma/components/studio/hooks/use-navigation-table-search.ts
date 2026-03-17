import { useCallback, useState } from "react";

type NavigationTableSearchState = {
  isOpen: boolean;
  term: string;
};

export function useNavigationTableSearch(args: {
  onOpenSearch: () => void;
}) {
  const { onOpenSearch } = args;
  const [state, setState] = useState<NavigationTableSearchState>({
    isOpen: false,
    term: "",
  });

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
    searchTerm: state.term,
    setSearchTerm,
  };
}
