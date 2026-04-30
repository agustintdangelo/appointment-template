import type { CSSProperties } from "react";

export const brandFontValues = [
  "INTER",
  "MANROPE",
  "DM_SANS",
  "SPACE_GROTESK",
  "LORA",
  "PLAYFAIR_DISPLAY",
  "CORMORANT_GARAMOND",
  "FRAUNCES",
] as const;

export const brandAssetKinds = ["LOGO", "LOGO_ALT", "FAVICON"] as const;

export type BrandFontValue = (typeof brandFontValues)[number];
export type BrandAssetKindValue = (typeof brandAssetKinds)[number];

export type BrandingSettings = {
  primaryFont: BrandFontValue;
  secondaryFont: BrandFontValue;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

export type BrandingWarning = {
  id: "text-background-contrast" | "primary-background-contrast";
  message: string;
};

type BrandFontOption = {
  value: BrandFontValue;
  label: string;
  category: "Sans serif" | "Serif" | "Display" | "Modern / elegant";
  cssVariable: string;
  fallback: string;
};

type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

const brandFontOptions: BrandFontOption[] = [
  {
    value: "INTER",
    label: "Inter",
    category: "Sans serif",
    cssVariable: "var(--font-inter)",
    fallback: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  },
  {
    value: "MANROPE",
    label: "Manrope",
    category: "Sans serif",
    cssVariable: "var(--font-manrope)",
    fallback: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  },
  {
    value: "DM_SANS",
    label: "DM Sans",
    category: "Sans serif",
    cssVariable: "var(--font-dm-sans)",
    fallback: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  },
  {
    value: "SPACE_GROTESK",
    label: "Space Grotesk",
    category: "Display",
    cssVariable: "var(--font-space-grotesk)",
    fallback: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  },
  {
    value: "LORA",
    label: "Lora",
    category: "Serif",
    cssVariable: "var(--font-lora)",
    fallback: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    value: "PLAYFAIR_DISPLAY",
    label: "Playfair Display",
    category: "Modern / elegant",
    cssVariable: "var(--font-playfair-display)",
    fallback: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    value: "CORMORANT_GARAMOND",
    label: "Cormorant Garamond",
    category: "Modern / elegant",
    cssVariable: "var(--font-cormorant-garamond)",
    fallback: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    value: "FRAUNCES",
    label: "Fraunces",
    category: "Display",
    cssVariable: "var(--font-fraunces)",
    fallback: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
];

export const defaultBrandingSettings: BrandingSettings = {
  primaryFont: "INTER",
  secondaryFont: "PLAYFAIR_DISPLAY",
  primaryColor: "#1b625a",
  secondaryColor: "#f2c7bb",
  backgroundColor: "#f4ece3",
  textColor: "#221d18",
};

const brandingTextContrastThreshold = 4.5;
const brandingPrimaryContrastThreshold = 3;

const brandAssetConfig = {
  LOGO: {
    label: "Main logo",
    description: "Used on light backgrounds like the site header.",
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    accept: ".png,.jpg,.jpeg,.webp",
  },
  LOGO_ALT: {
    label: "Alternate logo",
    description: "Used on dark surfaces when you need a reversed logo treatment.",
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    accept: ".png,.jpg,.jpeg,.webp",
  },
  FAVICON: {
    label: "Favicon",
    description: "Used for the browser tab icon and app metadata.",
    maxSizeBytes: 512 * 1024,
    allowedMimeTypes: ["image/png", "image/x-icon", "image/vnd.microsoft.icon"],
    accept: ".png,.ico",
  },
} as const satisfies Record<
  BrandAssetKindValue,
  {
    label: string;
    description: string;
    maxSizeBytes: number;
    allowedMimeTypes: readonly string[];
    accept: string;
  }
>;

const brandAssetFieldNames = {
  LOGO: "logo",
  LOGO_ALT: "logoAlt",
  FAVICON: "favicon",
} as const satisfies Record<BrandAssetKindValue, string>;

const brandAssetRemoveFieldNames = {
  LOGO: "removeLogo",
  LOGO_ALT: "removeLogoAlt",
  FAVICON: "removeFavicon",
} as const satisfies Record<BrandAssetKindValue, string>;

export type BrandAssetSummary = {
  id: string;
  kind: BrandAssetKindValue;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: Date | string | number;
};

export type ValidatedBrandAssetUpload = {
  kind: BrandAssetKindValue;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  data: Uint8Array;
};

export function getBrandFontOptions() {
  return brandFontOptions;
}

export function getBrandFontOptionsByCategory() {
  return Object.entries(
    brandFontOptions.reduce<Record<string, BrandFontOption[]>>((groups, option) => {
      groups[option.category] ??= [];
      groups[option.category].push(option);
      return groups;
    }, {}),
  ).map(([category, options]) => ({
    category,
    options,
  }));
}

export function getBrandAssetConfig(kind: BrandAssetKindValue) {
  return brandAssetConfig[kind];
}

export function getBrandAssetConfigs() {
  return brandAssetKinds.map((kind) => ({
    kind,
    ...brandAssetConfig[kind],
  }));
}

export function getBrandAssetFieldName(kind: BrandAssetKindValue) {
  return brandAssetFieldNames[kind];
}

export function getBrandAssetRemoveFieldName(kind: BrandAssetKindValue) {
  return brandAssetRemoveFieldNames[kind];
}

export function isBrandFontValue(value: string | null | undefined): value is BrandFontValue {
  return !!value && brandFontValues.includes(value as BrandFontValue);
}

export function isBrandAssetKindValue(
  value: string | null | undefined,
): value is BrandAssetKindValue {
  return !!value && brandAssetKinds.includes(value as BrandAssetKindValue);
}

export function normalizeHexColor(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!/^#?[0-9a-f]{6}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue.startsWith("#") ? normalizedValue : `#${normalizedValue}`;
}

export function normalizeBrandingSettings(
  input?: Partial<Record<keyof BrandingSettings, string | null | undefined>>,
): BrandingSettings {
  return {
    primaryFont: isBrandFontValue(input?.primaryFont)
      ? input.primaryFont
      : defaultBrandingSettings.primaryFont,
    secondaryFont: isBrandFontValue(input?.secondaryFont)
      ? input.secondaryFont
      : defaultBrandingSettings.secondaryFont,
    primaryColor:
      normalizeHexColor(input?.primaryColor) ?? defaultBrandingSettings.primaryColor,
    secondaryColor:
      normalizeHexColor(input?.secondaryColor) ?? defaultBrandingSettings.secondaryColor,
    backgroundColor:
      normalizeHexColor(input?.backgroundColor) ?? defaultBrandingSettings.backgroundColor,
    textColor: normalizeHexColor(input?.textColor) ?? defaultBrandingSettings.textColor,
  };
}

function parseHexColor(value: string): RgbColor {
  const normalizedValue = normalizeHexColor(value);

  if (!normalizedValue) {
    throw new Error(`Invalid hex color: ${value}`);
  }

  return {
    red: Number.parseInt(normalizedValue.slice(1, 3), 16),
    green: Number.parseInt(normalizedValue.slice(3, 5), 16),
    blue: Number.parseInt(normalizedValue.slice(5, 7), 16),
  };
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex(color: RgbColor) {
  return `#${[color.red, color.green, color.blue]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(firstColor: string, secondColor: string, secondColorWeight: number) {
  const start = parseHexColor(firstColor);
  const end = parseHexColor(secondColor);
  const weight = Math.max(0, Math.min(1, secondColorWeight));

  return rgbToHex({
    red: start.red + (end.red - start.red) * weight,
    green: start.green + (end.green - start.green) * weight,
    blue: start.blue + (end.blue - start.blue) * weight,
  });
}

function darkenHexColor(color: string, amount: number) {
  return mixHexColors(color, "#000000", amount);
}

function relativeLuminanceChannel(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: string) {
  const rgb = parseHexColor(color);

  return (
    0.2126 * relativeLuminanceChannel(rgb.red) +
    0.7152 * relativeLuminanceChannel(rgb.green) +
    0.0722 * relativeLuminanceChannel(rgb.blue)
  );
}

export function getContrastRatio(firstColor: string, secondColor: string) {
  const firstLuminance = getRelativeLuminance(firstColor);
  const secondLuminance = getRelativeLuminance(secondColor);
  const lightest = Math.max(firstLuminance, secondLuminance);
  const darkest = Math.min(firstLuminance, secondLuminance);

  return (lightest + 0.05) / (darkest + 0.05);
}

function getReadableForegroundColor(color: string, candidateColors: string[]) {
  let bestColor = candidateColors[0] ?? "#111827";
  let bestContrast = getContrastRatio(color, bestColor);

  for (const candidateColor of candidateColors.slice(1)) {
    const contrast = getContrastRatio(color, candidateColor);

    if (contrast > bestContrast) {
      bestColor = candidateColor;
      bestContrast = contrast;
    }
  }

  return bestColor;
}

function getFontStack(font: BrandFontValue) {
  const fontOption = brandFontOptions.find((option) => option.value === font);

  if (!fontOption) {
    return `${brandFontOptions[0].cssVariable}, ${brandFontOptions[0].fallback}`;
  }

  return `${fontOption.cssVariable}, ${fontOption.fallback}`;
}

export function getBrandingWarnings(
  input: Partial<Record<keyof BrandingSettings, string | null | undefined>>,
) {
  const normalizedSettings = normalizeBrandingSettings(input);
  const warnings: BrandingWarning[] = [];

  const textContrast = getContrastRatio(
    normalizedSettings.backgroundColor,
    normalizedSettings.textColor,
  );

  if (textContrast < brandingTextContrastThreshold) {
    warnings.push({
      id: "text-background-contrast",
      message: `Text and background contrast is ${textContrast.toFixed(
        2,
      )}:1. This may be difficult to read for some visitors.`,
    });
  }

  const primaryContrast = getContrastRatio(
    normalizedSettings.backgroundColor,
    normalizedSettings.primaryColor,
  );

  if (primaryContrast < brandingPrimaryContrastThreshold) {
    warnings.push({
      id: "primary-background-contrast",
      message: `Primary color contrast against the background is ${primaryContrast.toFixed(
        2,
      )}:1. Buttons and emphasis surfaces may feel low contrast.`,
    });
  }

  return warnings;
}

export function buildBrandTheme(input?: Partial<Record<keyof BrandingSettings, string | null>>) {
  const normalizedSettings = normalizeBrandingSettings(input);

  return {
    ...normalizedSettings,
    surfaceColor: mixHexColors(normalizedSettings.backgroundColor, "#ffffff", 0.58),
    cardColor: mixHexColors(normalizedSettings.backgroundColor, "#ffffff", 0.76),
    highlightSurfaceColor: mixHexColors(
      normalizedSettings.backgroundColor,
      normalizedSettings.secondaryColor,
      0.46,
    ),
    borderColor: mixHexColors(
      normalizedSettings.backgroundColor,
      normalizedSettings.textColor,
      0.12,
    ),
    mutedColor: mixHexColors(normalizedSettings.textColor, normalizedSettings.backgroundColor, 0.35),
    accentStrongColor: darkenHexColor(normalizedSettings.primaryColor, 0.26),
    accentForegroundColor: getReadableForegroundColor(normalizedSettings.primaryColor, [
      normalizedSettings.textColor,
      "#f8fafc",
      "#111827",
    ]),
    highlightForegroundColor: getReadableForegroundColor(
      mixHexColors(
        normalizedSettings.backgroundColor,
        normalizedSettings.secondaryColor,
        0.46,
      ),
      [normalizedSettings.textColor, "#f8fafc", "#111827"],
    ),
  };
}

export function buildBrandingCssVariables(
  input?: Partial<Record<keyof BrandingSettings, string | null>>,
) {
  const theme = buildBrandTheme(input);

  return {
    "--background": theme.backgroundColor,
    "--foreground": theme.textColor,
    "--muted": theme.mutedColor,
    "--surface": theme.surfaceColor,
    "--card": theme.cardColor,
    "--border": theme.borderColor,
    "--accent": theme.primaryColor,
    "--accent-strong": theme.accentStrongColor,
    "--accent-foreground": theme.accentForegroundColor,
    "--highlight": theme.secondaryColor,
    "--highlight-surface": theme.highlightSurfaceColor,
    "--highlight-foreground": theme.highlightForegroundColor,
    "--font-sans-stack": getFontStack(theme.primaryFont),
    "--font-display-stack": getFontStack(theme.secondaryFont),
  } as CSSProperties;
}

export async function readValidatedBrandAssetUpload(
  kind: BrandAssetKindValue,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const config = getBrandAssetConfig(kind);

  if (!config.allowedMimeTypes.some((mimeType) => mimeType === value.type)) {
    throw new Error(
      `${config.label} must use one of these file types: ${config.allowedMimeTypes.join(", ")}.`,
    );
  }

  if (value.size > config.maxSizeBytes) {
    const sizeLabel =
      config.maxSizeBytes >= 1024 * 1024
        ? `${config.maxSizeBytes / 1024 / 1024} MB`
        : `${config.maxSizeBytes / 1024} KB`;

    throw new Error(
      `${config.label} must be ${sizeLabel} or smaller.`,
    );
  }

  return {
    kind,
    originalFilename: value.name || `${kind.toLowerCase()}.bin`,
    mimeType: value.type,
    sizeBytes: value.size,
    data: new Uint8Array(await value.arrayBuffer()),
  } satisfies ValidatedBrandAssetUpload;
}

export function buildBrandAssetUrl(asset?: Pick<BrandAssetSummary, "id" | "updatedAt"> | null) {
  if (!asset) {
    return null;
  }

  const updatedAt =
    asset.updatedAt instanceof Date ? asset.updatedAt.getTime() : new Date(asset.updatedAt).getTime();

  if (Number.isNaN(updatedAt)) {
    return `/api/brand-assets/${asset.id}`;
  }

  return `/api/brand-assets/${asset.id}?v=${updatedAt}`;
}
