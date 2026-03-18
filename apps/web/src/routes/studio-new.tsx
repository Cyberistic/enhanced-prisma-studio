import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { PrismaStudioExample } from "@/components/prisma/studio-example";
import { StudioThemedLayout } from "@/components/studio-themed-layout";
import { Button } from "@/components/ui/button";
import { StudioThemeProvider } from "@/lib/studio-theme-context";
import {
  applyRadiusPreset,
  getRadiusOptionList,
  getRandomRadiusValueExcluding,
  getRandomThemeValue,
  getRandomThemeValueExcluding,
  getThemeOptionList,
  mergeTheme,
  parseThemeValue,
} from "@/lib/studio-theme-randomizer";

export const Route = createFileRoute("/studio-new")({
  component: StudioNewRouteComponent,
});

function StudioNewRouteComponent() {
  const { resolvedTheme } = useTheme();
  const options = getThemeOptionList();
  const radiusOptions = getRadiusOptionList();
  const [themeValue, setThemeValue] = useState<string>(() => getRandomThemeValue());
  const [radiusValue, setRadiusValue] = useState<string>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const studioTheme = useMemo(() => {
    const { baseColor, theme } = parseThemeValue(themeValue);
    const mergedTheme = mergeTheme(baseColor, theme);
    return applyRadiusPreset(mergedTheme, radiusValue);
  }, [radiusValue, themeValue]);

  const currentFontLabel = useMemo(() => {
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const fontSans = studioTheme[mode]["--font-sans"];
    if (!fontSans) {
      return "default";
    }

    return fontSans.split(",")[0]?.replaceAll("'", "").replaceAll('"', "") || "default";
  }, [resolvedTheme, studioTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const vars = studioTheme[mode];
    const previousValues = new Map<string, string>();

    for (const [name, value] of Object.entries(vars)) {
      previousValues.set(name, root.style.getPropertyValue(name));
      root.style.setProperty(name, value);
    }

    return () => {
      for (const [name, previousValue] of previousValues) {
        if (previousValue) {
          root.style.setProperty(name, previousValue);
        } else {
          root.style.removeProperty(name);
        }
      }
    };
  }, [resolvedTheme, studioTheme]);

  function randomizeTheme() {
    setThemeValue((currentValue) => getRandomThemeValueExcluding(currentValue));
    setRadiusValue((currentValue) => getRandomRadiusValueExcluding(currentValue));
  }

  return (
    <StudioThemeProvider value={{ theme: studioTheme }}>
      <StudioThemedLayout className="grid h-full min-h-0 grid-rows-[auto_1fr] bg-background text-foreground">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-card/70 px-4 py-3">
          <h1 className="mr-3 text-xl font-semibold tracking-tight">Studio New (Enhanced)</h1>
          <select
            value={themeValue}
            onChange={(event) => setThemeValue(event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={radiusValue}
            onChange={(event) => setRadiusValue(event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {radiusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={randomizeTheme}>
            Randomize
          </Button>
          <span className="text-xs text-muted-foreground">
            Mode: {mounted ? (resolvedTheme ?? "light") : "..."} |{" "}
            {themeValue.replace("preset:", "")} | {radiusValue} | {currentFontLabel}
          </span>
        </div>

        <PrismaStudioExample theme={studioTheme} />
      </StudioThemedLayout>
    </StudioThemeProvider>
  );
}
