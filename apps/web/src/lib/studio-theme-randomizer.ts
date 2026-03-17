import { allPresets, type ThemePreset } from "@madooei/shadcn-theme-presets";

export type StudioThemeVariables = Record<string, string>;

export type StudioTheme = {
  light: StudioThemeVariables;
  dark: StudioThemeVariables;
};

type RadiusPreset = {
  name: string;
  title: string;
  value: string;
};

const RADIUS_PRESETS: RadiusPreset[] = [
  { name: "compact", title: "Compact", value: "0.35rem" },
  { name: "default", title: "Default", value: "0.625rem" },
  { name: "comfortable", title: "Comfortable", value: "0.9rem" },
  { name: "rounded", title: "Rounded", value: "1.2rem" },
  { name: "pill", title: "Pill", value: "1.8rem" },
];

function toStudioVariables(vars: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(vars).map(([name, value]) => [`--${name}`, value]),
  ) as StudioThemeVariables;
}

function toStringMap(vars: ThemePreset["styles"]["light"]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(vars).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function toOptionLabel(name: string, preset: ThemePreset) {
  return preset.label || name;
}

function toThemeValue(name: string) {
  return `preset:${name}`;
}

function fromThemeValue(themeValue: string) {
  const [type, rawName] = themeValue.split(":");
  if (type === "preset" && rawName && allPresets[rawName]) {
    return rawName;
  }

  return "default-neutral";
}

export function mergeTheme(_baseColorName: string, themeName: string): StudioTheme {
  const presetName = fromThemeValue(themeName);
  const preset = allPresets[presetName] ?? allPresets["default-neutral"];

  return {
    dark: toStudioVariables(toStringMap(preset.styles.dark)),
    light: toStudioVariables(toStringMap(preset.styles.light)),
  };
}

export function applyRadiusPreset(theme: StudioTheme, radiusPresetName: string): StudioTheme {
  const preset = RADIUS_PRESETS.find((item) => item.name === radiusPresetName);
  const radiusValue = preset?.value ?? "0.625rem";

  return {
    dark: {
      ...theme.dark,
      "--radius": radiusValue,
    },
    light: {
      ...theme.light,
      "--radius": radiusValue,
    },
  };
}

export function getThemeOptionList() {
  return Object.entries(allPresets)
    .map(([name, preset]) => ({
      baseColor: "preset",
      label: toOptionLabel(name, preset),
      theme: toThemeValue(name),
      value: toThemeValue(name),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
  return options[randomIndex]?.value ?? "preset:default-neutral";
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
  return { baseColor: "preset", theme: themeValue };
}
