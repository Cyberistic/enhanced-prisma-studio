import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { CSSProperties } from "react";

import type { StudioTheme } from "@/lib/studio-theme-randomizer";

export type StudioThemeContextValue = {
  theme: StudioTheme;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

export function StudioThemeProvider(props: {
  children: ReactNode;
  value: StudioThemeContextValue;
}) {
  return (
    <StudioThemeContext.Provider value={props.value}>{props.children}</StudioThemeContext.Provider>
  );
}

export function useStudioThemeContext() {
  return useContext(StudioThemeContext);
}

export function applyThemeVarsToStyle(theme: StudioTheme, mode: "light" | "dark") {
  const vars = theme[mode];
  const style = {} as CSSProperties & Record<string, string>;

  for (const [name, value] of Object.entries(vars)) {
    style[name] = value;
  }

  return style as CSSProperties;
}
