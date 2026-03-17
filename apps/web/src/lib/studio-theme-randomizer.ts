export type StudioThemeVariables = Record<string, string>;

export type StudioTheme = {
  light: StudioThemeVariables;
  dark: StudioThemeVariables;
};

type ThemeRecipe = {
  name: string;
  title: string;
  cssVars: StudioTheme;
};

type RadiusPreset = {
  name: string;
  title: string;
  value: string;
};

const BASE_COLORS: ThemeRecipe[] = [
  {
    name: "slate",
    title: "Slate",
    cssVars: {
      light: {
        "--background": "oklch(0.98 0.005 240)",
        "--foreground": "oklch(0.18 0.01 255)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.18 0.01 255)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.18 0.01 255)",
        "--secondary": "oklch(0.95 0.01 248)",
        "--secondary-foreground": "oklch(0.24 0.02 255)",
        "--muted": "oklch(0.95 0.01 248)",
        "--muted-foreground": "oklch(0.54 0.02 250)",
        "--accent": "oklch(0.95 0.01 248)",
        "--accent-foreground": "oklch(0.24 0.02 255)",
        "--border": "oklch(0.89 0.01 245)",
        "--input": "oklch(0.89 0.01 245)",
        "--destructive": "oklch(0.62 0.22 25)",
      },
      dark: {
        "--background": "oklch(0.2 0.02 255)",
        "--foreground": "oklch(0.96 0.01 250)",
        "--card": "oklch(0.24 0.02 255)",
        "--card-foreground": "oklch(0.96 0.01 250)",
        "--popover": "oklch(0.24 0.02 255)",
        "--popover-foreground": "oklch(0.96 0.01 250)",
        "--secondary": "oklch(0.3 0.02 255)",
        "--secondary-foreground": "oklch(0.96 0.01 250)",
        "--muted": "oklch(0.3 0.02 255)",
        "--muted-foreground": "oklch(0.74 0.02 245)",
        "--accent": "oklch(0.3 0.02 255)",
        "--accent-foreground": "oklch(0.96 0.01 250)",
        "--border": "oklch(0.36 0.02 255)",
        "--input": "oklch(0.36 0.02 255)",
        "--destructive": "oklch(0.67 0.2 24)",
      },
    },
  },
  {
    name: "stone",
    title: "Stone",
    cssVars: {
      light: {
        "--background": "oklch(0.985 0.004 80)",
        "--foreground": "oklch(0.2 0.01 70)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.2 0.01 70)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.2 0.01 70)",
        "--secondary": "oklch(0.95 0.006 82)",
        "--secondary-foreground": "oklch(0.26 0.01 70)",
        "--muted": "oklch(0.95 0.006 82)",
        "--muted-foreground": "oklch(0.56 0.01 70)",
        "--accent": "oklch(0.95 0.006 82)",
        "--accent-foreground": "oklch(0.26 0.01 70)",
        "--border": "oklch(0.9 0.006 80)",
        "--input": "oklch(0.9 0.006 80)",
        "--destructive": "oklch(0.63 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.21 0.01 75)",
        "--foreground": "oklch(0.96 0.006 90)",
        "--card": "oklch(0.25 0.01 75)",
        "--card-foreground": "oklch(0.96 0.006 90)",
        "--popover": "oklch(0.25 0.01 75)",
        "--popover-foreground": "oklch(0.96 0.006 90)",
        "--secondary": "oklch(0.3 0.01 75)",
        "--secondary-foreground": "oklch(0.96 0.006 90)",
        "--muted": "oklch(0.3 0.01 75)",
        "--muted-foreground": "oklch(0.74 0.01 80)",
        "--accent": "oklch(0.3 0.01 75)",
        "--accent-foreground": "oklch(0.96 0.006 90)",
        "--border": "oklch(0.36 0.01 75)",
        "--input": "oklch(0.36 0.01 75)",
        "--destructive": "oklch(0.67 0.19 24)",
      },
    },
  },
  {
    name: "neutral",
    title: "Neutral",
    cssVars: {
      light: {
        "--background": "oklch(0.99 0 0)",
        "--foreground": "oklch(0.2 0 0)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.2 0 0)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.2 0 0)",
        "--secondary": "oklch(0.96 0 0)",
        "--secondary-foreground": "oklch(0.27 0 0)",
        "--muted": "oklch(0.96 0 0)",
        "--muted-foreground": "oklch(0.56 0 0)",
        "--accent": "oklch(0.96 0 0)",
        "--accent-foreground": "oklch(0.27 0 0)",
        "--border": "oklch(0.91 0 0)",
        "--input": "oklch(0.91 0 0)",
        "--destructive": "oklch(0.64 0.21 25)",
      },
      dark: {
        "--background": "oklch(0.2 0 0)",
        "--foreground": "oklch(0.96 0 0)",
        "--card": "oklch(0.24 0 0)",
        "--card-foreground": "oklch(0.96 0 0)",
        "--popover": "oklch(0.24 0 0)",
        "--popover-foreground": "oklch(0.96 0 0)",
        "--secondary": "oklch(0.3 0 0)",
        "--secondary-foreground": "oklch(0.96 0 0)",
        "--muted": "oklch(0.3 0 0)",
        "--muted-foreground": "oklch(0.74 0 0)",
        "--accent": "oklch(0.3 0 0)",
        "--accent-foreground": "oklch(0.96 0 0)",
        "--border": "oklch(0.36 0 0)",
        "--input": "oklch(0.36 0 0)",
        "--destructive": "oklch(0.67 0.2 24)",
      },
    },
  },
  {
    name: "sky",
    title: "Sky",
    cssVars: {
      light: {
        "--background": "oklch(0.985 0.015 235)",
        "--foreground": "oklch(0.23 0.03 245)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.23 0.03 245)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.23 0.03 245)",
        "--secondary": "oklch(0.95 0.02 236)",
        "--secondary-foreground": "oklch(0.28 0.04 245)",
        "--muted": "oklch(0.95 0.02 236)",
        "--muted-foreground": "oklch(0.56 0.03 240)",
        "--accent": "oklch(0.95 0.02 236)",
        "--accent-foreground": "oklch(0.28 0.04 245)",
        "--border": "oklch(0.9 0.015 236)",
        "--input": "oklch(0.9 0.015 236)",
        "--destructive": "oklch(0.63 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.23 0.03 245)",
        "--foreground": "oklch(0.96 0.01 235)",
        "--card": "oklch(0.27 0.03 245)",
        "--card-foreground": "oklch(0.96 0.01 235)",
        "--popover": "oklch(0.27 0.03 245)",
        "--popover-foreground": "oklch(0.96 0.01 235)",
        "--secondary": "oklch(0.33 0.03 245)",
        "--secondary-foreground": "oklch(0.96 0.01 235)",
        "--muted": "oklch(0.33 0.03 245)",
        "--muted-foreground": "oklch(0.75 0.02 238)",
        "--accent": "oklch(0.33 0.03 245)",
        "--accent-foreground": "oklch(0.96 0.01 235)",
        "--border": "oklch(0.39 0.03 245)",
        "--input": "oklch(0.39 0.03 245)",
        "--destructive": "oklch(0.67 0.18 24)",
      },
    },
  },
  {
    name: "emerald-base",
    title: "Emerald Base",
    cssVars: {
      light: {
        "--background": "oklch(0.985 0.012 160)",
        "--foreground": "oklch(0.24 0.04 165)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.24 0.04 165)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.24 0.04 165)",
        "--secondary": "oklch(0.95 0.018 162)",
        "--secondary-foreground": "oklch(0.29 0.05 168)",
        "--muted": "oklch(0.95 0.018 162)",
        "--muted-foreground": "oklch(0.56 0.03 165)",
        "--accent": "oklch(0.95 0.018 162)",
        "--accent-foreground": "oklch(0.29 0.05 168)",
        "--border": "oklch(0.9 0.015 162)",
        "--input": "oklch(0.9 0.015 162)",
        "--destructive": "oklch(0.63 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.24 0.04 165)",
        "--foreground": "oklch(0.96 0.01 160)",
        "--card": "oklch(0.28 0.04 165)",
        "--card-foreground": "oklch(0.96 0.01 160)",
        "--popover": "oklch(0.28 0.04 165)",
        "--popover-foreground": "oklch(0.96 0.01 160)",
        "--secondary": "oklch(0.34 0.04 165)",
        "--secondary-foreground": "oklch(0.96 0.01 160)",
        "--muted": "oklch(0.34 0.04 165)",
        "--muted-foreground": "oklch(0.76 0.02 162)",
        "--accent": "oklch(0.34 0.04 165)",
        "--accent-foreground": "oklch(0.96 0.01 160)",
        "--border": "oklch(0.4 0.04 165)",
        "--input": "oklch(0.4 0.04 165)",
        "--destructive": "oklch(0.67 0.18 24)",
      },
    },
  },
  {
    name: "rose",
    title: "Rose",
    cssVars: {
      light: {
        "--background": "oklch(0.985 0.015 8)",
        "--foreground": "oklch(0.24 0.04 10)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.24 0.04 10)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.24 0.04 10)",
        "--secondary": "oklch(0.95 0.02 10)",
        "--secondary-foreground": "oklch(0.3 0.05 12)",
        "--muted": "oklch(0.95 0.02 10)",
        "--muted-foreground": "oklch(0.57 0.03 10)",
        "--accent": "oklch(0.95 0.02 10)",
        "--accent-foreground": "oklch(0.3 0.05 12)",
        "--border": "oklch(0.9 0.015 10)",
        "--input": "oklch(0.9 0.015 10)",
        "--destructive": "oklch(0.63 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.24 0.04 10)",
        "--foreground": "oklch(0.96 0.01 8)",
        "--card": "oklch(0.28 0.04 10)",
        "--card-foreground": "oklch(0.96 0.01 8)",
        "--popover": "oklch(0.28 0.04 10)",
        "--popover-foreground": "oklch(0.96 0.01 8)",
        "--secondary": "oklch(0.34 0.04 10)",
        "--secondary-foreground": "oklch(0.96 0.01 8)",
        "--muted": "oklch(0.34 0.04 10)",
        "--muted-foreground": "oklch(0.76 0.02 10)",
        "--accent": "oklch(0.34 0.04 10)",
        "--accent-foreground": "oklch(0.96 0.01 8)",
        "--border": "oklch(0.4 0.04 10)",
        "--input": "oklch(0.4 0.04 10)",
        "--destructive": "oklch(0.67 0.18 24)",
      },
    },
  },
  {
    name: "amber",
    title: "Amber",
    cssVars: {
      light: {
        "--background": "oklch(0.99 0.015 88)",
        "--foreground": "oklch(0.24 0.04 85)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.24 0.04 85)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.24 0.04 85)",
        "--secondary": "oklch(0.95 0.02 88)",
        "--secondary-foreground": "oklch(0.31 0.05 82)",
        "--muted": "oklch(0.95 0.02 88)",
        "--muted-foreground": "oklch(0.58 0.03 84)",
        "--accent": "oklch(0.95 0.02 88)",
        "--accent-foreground": "oklch(0.31 0.05 82)",
        "--border": "oklch(0.9 0.015 88)",
        "--input": "oklch(0.9 0.015 88)",
        "--destructive": "oklch(0.63 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.24 0.04 85)",
        "--foreground": "oklch(0.96 0.01 88)",
        "--card": "oklch(0.28 0.04 85)",
        "--card-foreground": "oklch(0.96 0.01 88)",
        "--popover": "oklch(0.28 0.04 85)",
        "--popover-foreground": "oklch(0.96 0.01 88)",
        "--secondary": "oklch(0.34 0.04 85)",
        "--secondary-foreground": "oklch(0.96 0.01 88)",
        "--muted": "oklch(0.34 0.04 85)",
        "--muted-foreground": "oklch(0.76 0.02 86)",
        "--accent": "oklch(0.34 0.04 85)",
        "--accent-foreground": "oklch(0.96 0.01 88)",
        "--border": "oklch(0.4 0.04 85)",
        "--input": "oklch(0.4 0.04 85)",
        "--destructive": "oklch(0.67 0.18 24)",
      },
    },
  },
];

const THEMES: ThemeRecipe[] = [
  {
    name: "ocean",
    title: "Ocean",
    cssVars: {
      light: {
        "--primary": "oklch(0.55 0.2 250)",
        "--primary-foreground": "oklch(0.98 0.01 250)",
        "--ring": "oklch(0.62 0.18 248)",
        "--chart-1": "oklch(0.72 0.14 245)",
        "--chart-2": "oklch(0.64 0.18 255)",
        "--chart-3": "oklch(0.58 0.2 265)",
        "--chart-4": "oklch(0.53 0.22 275)",
        "--chart-5": "oklch(0.48 0.2 285)",
      },
      dark: {
        "--primary": "oklch(0.73 0.14 246)",
        "--primary-foreground": "oklch(0.22 0.03 255)",
        "--ring": "oklch(0.64 0.17 250)",
        "--chart-1": "oklch(0.76 0.12 245)",
        "--chart-2": "oklch(0.68 0.16 255)",
        "--chart-3": "oklch(0.62 0.18 265)",
        "--chart-4": "oklch(0.57 0.19 275)",
        "--chart-5": "oklch(0.51 0.18 286)",
      },
    },
  },
  {
    name: "forest",
    title: "Forest",
    cssVars: {
      light: {
        "--primary": "oklch(0.53 0.16 155)",
        "--primary-foreground": "oklch(0.98 0.01 145)",
        "--ring": "oklch(0.6 0.15 152)",
        "--chart-1": "oklch(0.72 0.12 150)",
        "--chart-2": "oklch(0.66 0.15 160)",
        "--chart-3": "oklch(0.59 0.18 168)",
        "--chart-4": "oklch(0.53 0.2 176)",
        "--chart-5": "oklch(0.48 0.18 184)",
      },
      dark: {
        "--primary": "oklch(0.72 0.12 152)",
        "--primary-foreground": "oklch(0.22 0.02 160)",
        "--ring": "oklch(0.64 0.13 155)",
        "--chart-1": "oklch(0.75 0.1 150)",
        "--chart-2": "oklch(0.68 0.13 160)",
        "--chart-3": "oklch(0.62 0.15 168)",
        "--chart-4": "oklch(0.56 0.17 176)",
        "--chart-5": "oklch(0.5 0.16 184)",
      },
    },
  },
  {
    name: "sunset",
    title: "Sunset",
    cssVars: {
      light: {
        "--primary": "oklch(0.62 0.2 35)",
        "--primary-foreground": "oklch(0.99 0.01 70)",
        "--ring": "oklch(0.68 0.17 40)",
        "--chart-1": "oklch(0.74 0.14 55)",
        "--chart-2": "oklch(0.69 0.16 45)",
        "--chart-3": "oklch(0.63 0.18 35)",
        "--chart-4": "oklch(0.57 0.2 28)",
        "--chart-5": "oklch(0.51 0.19 18)",
      },
      dark: {
        "--primary": "oklch(0.74 0.14 45)",
        "--primary-foreground": "oklch(0.24 0.03 24)",
        "--ring": "oklch(0.66 0.16 40)",
        "--chart-1": "oklch(0.76 0.12 55)",
        "--chart-2": "oklch(0.71 0.14 45)",
        "--chart-3": "oklch(0.65 0.16 35)",
        "--chart-4": "oklch(0.58 0.18 28)",
        "--chart-5": "oklch(0.53 0.18 18)",
      },
    },
  },
  {
    name: "purple",
    title: "Purple",
    cssVars: {
      light: {
        "--primary": "oklch(0.58 0.23 300)",
        "--primary-foreground": "oklch(0.98 0.01 300)",
        "--ring": "oklch(0.66 0.2 302)",
        "--chart-1": "oklch(0.73 0.15 295)",
        "--chart-2": "oklch(0.67 0.18 302)",
        "--chart-3": "oklch(0.61 0.2 309)",
        "--chart-4": "oklch(0.56 0.21 317)",
        "--chart-5": "oklch(0.5 0.2 325)",
      },
      dark: {
        "--primary": "oklch(0.74 0.14 300)",
        "--primary-foreground": "oklch(0.23 0.03 305)",
        "--ring": "oklch(0.67 0.16 302)",
        "--chart-1": "oklch(0.77 0.12 295)",
        "--chart-2": "oklch(0.7 0.14 302)",
        "--chart-3": "oklch(0.64 0.16 309)",
        "--chart-4": "oklch(0.58 0.17 317)",
        "--chart-5": "oklch(0.52 0.16 325)",
      },
    },
  },
  {
    name: "emerald",
    title: "Emerald",
    cssVars: {
      light: {
        "--primary": "oklch(0.6 0.18 165)",
        "--primary-foreground": "oklch(0.98 0.01 165)",
        "--ring": "oklch(0.66 0.16 164)",
        "--chart-1": "oklch(0.75 0.12 150)",
        "--chart-2": "oklch(0.69 0.15 160)",
        "--chart-3": "oklch(0.63 0.17 170)",
        "--chart-4": "oklch(0.57 0.18 180)",
        "--chart-5": "oklch(0.51 0.17 190)",
      },
      dark: {
        "--primary": "oklch(0.75 0.13 162)",
        "--primary-foreground": "oklch(0.22 0.03 170)",
        "--ring": "oklch(0.67 0.14 162)",
        "--chart-1": "oklch(0.78 0.11 150)",
        "--chart-2": "oklch(0.71 0.13 160)",
        "--chart-3": "oklch(0.65 0.15 170)",
        "--chart-4": "oklch(0.59 0.16 180)",
        "--chart-5": "oklch(0.53 0.15 190)",
      },
    },
  },
];

const RADIUS_PRESETS: RadiusPreset[] = [
  { name: "compact", title: "Compact", value: "0.35rem" },
  { name: "default", title: "Default", value: "0.625rem" },
  { name: "comfortable", title: "Comfortable", value: "0.9rem" },
  { name: "rounded", title: "Rounded", value: "1.2rem" },
  { name: "pill", title: "Pill", value: "1.8rem" },
];

export function mergeTheme(baseColorName: string, themeName: string): StudioTheme {
  const baseColor = BASE_COLORS.find((color) => color.name === baseColorName);
  const theme = THEMES.find((candidate) => candidate.name === themeName);

  if (!baseColor || !theme) {
    throw new Error(`Unknown theme combo: ${baseColorName}/${themeName}`);
  }

  return {
    light: {
      ...baseColor.cssVars.light,
      ...theme.cssVars.light,
    },
    dark: {
      ...baseColor.cssVars.dark,
      ...theme.cssVars.dark,
    },
  };
}

export function buildShadcnThemeCss(theme: StudioTheme) {
  const lightVars = Object.entries(theme.light)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  const darkVars = Object.entries(theme.dark)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `:root {\n${lightVars}\n}\n\n.dark {\n${darkVars}\n}`;
}

export function buildScopedStudioThemeCss(theme: StudioTheme, selector = ".ps") {
  const lightVars = Object.entries(theme.light)
    .map(([name, value]) => `  ${name}: ${value} !important;`)
    .join("\n");

  const darkVars = Object.entries(theme.dark)
    .map(([name, value]) => `  ${name}: ${value} !important;`)
    .join("\n");

  return `${selector}${selector} {\n${lightVars}\n}\n\n.dark ${selector}${selector} {\n${darkVars}\n}`;
}

export function applyRadiusPreset(theme: StudioTheme, radiusPresetName: string): StudioTheme {
  const preset = RADIUS_PRESETS.find((item) => item.name === radiusPresetName);
  const radiusValue = preset?.value ?? "0.625rem";

  return {
    light: {
      ...theme.light,
      "--radius": radiusValue,
    },
    dark: {
      ...theme.dark,
      "--radius": radiusValue,
    },
  };
}

export function getThemeOptionList() {
  return BASE_COLORS.flatMap((baseColor) =>
    THEMES.map((theme) => ({
      baseColor: baseColor.name,
      label: `${baseColor.title} x ${theme.title}`,
      theme: theme.name,
      value: `${baseColor.name}:${theme.name}`,
    })),
  );
}

export function getRadiusOptionList() {
  return RADIUS_PRESETS.map((preset) => ({
    label: `${preset.title} (${preset.value})`,
    value: preset.name,
  }));
}

export function getRandomThemeValue() {
  const options = getThemeOptionList();
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex]?.value ?? "slate:ocean";
}

export function getRandomThemeValueExcluding(currentValue: string) {
  const options = getThemeOptionList().map((option) => option.value);
  const candidates = options.filter((option) => option !== currentValue);
  if (candidates.length === 0) {
    return currentValue;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex] ?? currentValue;
}

export function getRandomRadiusValue() {
  const randomIndex = Math.floor(Math.random() * RADIUS_PRESETS.length);
  return RADIUS_PRESETS[randomIndex]?.name ?? "default";
}

export function getRandomRadiusValueExcluding(currentValue: string) {
  const candidates = RADIUS_PRESETS.map((preset) => preset.name).filter(
    (value) => value !== currentValue,
  );

  if (candidates.length === 0) {
    return currentValue;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex] ?? currentValue;
}

export function parseThemeValue(themeValue: string) {
  const [baseColor = "slate", theme = "ocean"] = themeValue.split(":");
  return { baseColor, theme };
}
