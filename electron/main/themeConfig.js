export const WINDOW_TITLE_BAR_HEIGHT = 36;

const TITLE_BAR_FALLBACK_THEME = {
  light: {
    color: "#d5deea",
    symbolColor: "#0f172a",
  },
  dark: {
    color: "#070c14",
    symbolColor: "#f8fafc",
  },
};

const parseCssVariableBlock = (cssBlock) => {
  if (typeof cssBlock !== "string" || cssBlock.length === 0) {
    return {};
  }

  const tokens = {};

  for (const match of cssBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const tokenName = match[1]?.trim();
    const tokenValue = match[2]?.replace(/\s+/g, " ").trim();

    if (!tokenName || !tokenValue) {
      continue;
    }

    tokens[tokenName] = tokenValue;
  }

  return tokens;
};

const readAppThemeTokens = (fs, cssPath) => {
  try {
    const cssSource = fs.readFileSync(cssPath, "utf8");
    const lightBlock = cssSource.match(/:root\s*{([\s\S]*?)}/)?.[1] || "";
    const darkBlock = cssSource.match(/:root\[theme=["']dark["']\]\s*{([\s\S]*?)}/)?.[1] || "";
    const lightTokens = parseCssVariableBlock(lightBlock);

    return {
      light: lightTokens,
      dark: {
        ...lightTokens,
        ...parseCssVariableBlock(darkBlock),
      },
    };
  } catch {
    return {
      light: {},
      dark: {},
    };
  }
};

export const createThemeConfig = ({ fs, cssPath }) => {
  const appThemeTokens = readAppThemeTokens(fs, cssPath);
  const resolveThemeToken = (tokenName, themeName = "light", fallbackValue = "") => {
    const themeTokens = appThemeTokens[themeName] || appThemeTokens.light;
    const resolvedValue = themeTokens?.[tokenName] || appThemeTokens.light?.[tokenName];

    if (typeof resolvedValue === "string" && resolvedValue.length > 0) {
      return resolvedValue;
    }

    return fallbackValue;
  };

  return {
    windowTitleBarTheme: {
      light: {
        color: resolveThemeToken(
          "color-titlebar",
          "light",
          TITLE_BAR_FALLBACK_THEME.light.color,
        ),
        symbolColor: resolveThemeToken(
          "color-titlebar-symbol",
          "light",
          TITLE_BAR_FALLBACK_THEME.light.symbolColor,
        ),
      },
      dark: {
        color: resolveThemeToken(
          "color-titlebar",
          "dark",
          TITLE_BAR_FALLBACK_THEME.dark.color,
        ),
        symbolColor: resolveThemeToken(
          "color-titlebar-symbol",
          "dark",
          TITLE_BAR_FALLBACK_THEME.dark.symbolColor,
        ),
      },
    },
    fatalStartupErrorTheme: {
      bodyBackground: resolveThemeToken("color-bg", "dark"),
      bodyText: resolveThemeToken("color-text", "dark"),
      cardBorder: resolveThemeToken("color-border", "dark"),
      cardBackground: resolveThemeToken("color-surface", "dark"),
      cardShadow: resolveThemeToken("shadow-md", "dark"),
      mutedText: resolveThemeToken("color-text-muted", "dark"),
      codeBorder: resolveThemeToken("flashcard-border", "dark"),
      codeBackground: resolveThemeToken("color-surface-muted", "dark"),
    },
  };
};
