import { useTheme } from "next-themes";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";

import { useStudioThemeContext } from "@/lib/studio-theme-context";

export function StudioThemedLayout(props: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { children, className, style } = props;
  const { resolvedTheme } = useTheme();
  const studioThemeContext = useStudioThemeContext();

  const themedStyle = useMemo(() => {
    if (!studioThemeContext) {
      return style;
    }

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const vars = studioThemeContext.theme[mode];
    const merged = { ...(style ?? {}) } as CSSProperties & Record<string, string>;

    for (const [name, value] of Object.entries(vars)) {
      merged[name] = value;
    }

    return merged as CSSProperties;
  }, [resolvedTheme, studioThemeContext, style]);

  return (
    <div className={className} style={themedStyle}>
      {children}
    </div>
  );
}
