import { useEffect, useMemo } from "react";
/**
 * Parse CSS variables from shadcn format CSS string
 * Handles both :root and .dark selectors
 */
export function parseThemeFromCSS(cssString) {
  try {
    const theme = { light: {}, dark: {} };
    // Remove @layer base wrapper if present
    const cleanCss = cssString.replace(/@layer\s+base\s*\{|\}$/g, "").trim();
    // Split by selectors
    const rootMatch = cleanCss.match(/:root\s*\{([^}]+)\}/);
    const darkMatch = cleanCss.match(/\.dark\s*\{([^}]+)\}/);
    if (rootMatch && rootMatch[1]) {
      theme.light = parseVariables(rootMatch[1]);
    }
    if (darkMatch && darkMatch[1]) {
      theme.dark = parseVariables(darkMatch[1]);
    }
    // Return null if no valid theme found
    if (Object.keys(theme.light).length === 0 && Object.keys(theme.dark).length === 0) {
      return null;
    }
    return theme;
  } catch {
    return null;
  }
}
/**
 * Parse CSS variables from a CSS block content
 */
function parseVariables(cssContent) {
  const variables = {};
  const variableRegex = /--([\w-]+):\s*([^;]+);?/g;
  let match;
  while ((match = variableRegex.exec(cssContent)) !== null) {
    const [, name, value] = match;
    if (name && value) {
      variables[`--${name}`] = value.trim();
    }
  }
  return variables;
}
/**
 * Apply theme variables to the document root
 */
export function applyThemeVariables(variables) {
  const root = document.documentElement;
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}
/**
 * Apply dark mode class to Studio root element
 */
export function applyDarkModeClass(isDarkMode) {
  const studioRoot = document.querySelector(".ps");
  if (studioRoot) {
    if (isDarkMode) {
      studioRoot.classList.add("dark");
    } else {
      studioRoot.classList.remove("dark");
    }
  }
}
/**
 * Hook to manage custom theme application
 */
export function useTheme(customTheme, isDarkMode) {
  const parsedTheme = useMemo(() => {
    if (!customTheme) return null;
    if (typeof customTheme === "string") {
      return parseThemeFromCSS(customTheme);
    }
    return customTheme;
  }, [customTheme]);
  const currentThemeVariables = useMemo(() => {
    if (!parsedTheme) return null;
    const mode = isDarkMode ? "dark" : "light";
    return parsedTheme[mode] || {};
  }, [parsedTheme, isDarkMode]);
  // Apply theme variables when they change
  useEffect(() => {
    if (currentThemeVariables) {
      applyThemeVariables(currentThemeVariables);
    }
  }, [currentThemeVariables]);
  // Apply dark mode class to Studio root element
  useEffect(() => {
    applyDarkModeClass(isDarkMode ?? false);
  }, [isDarkMode]);
  return {
    parsedTheme,
    currentThemeVariables,
    hasCustomTheme: !!parsedTheme,
  };
}
