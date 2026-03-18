import { createContext, type ReactNode, useContext } from "react";

import type { StudioThemeInput } from "../types";

const PrismaStudioThemeContext = createContext<StudioThemeInput | undefined>(undefined);

export function PrismaStudioThemeProvider(props: {
  children: ReactNode;
  theme?: StudioThemeInput;
}) {
  const { children, theme } = props;

  return (
    <PrismaStudioThemeContext.Provider value={theme}>{children}</PrismaStudioThemeContext.Provider>
  );
}

export function usePrismaStudioTheme() {
  return useContext(PrismaStudioThemeContext);
}
