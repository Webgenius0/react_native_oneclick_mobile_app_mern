import { storageGet, storageSet } from "./storage";

export const getTheme = async () => {

  const theme = await storageGet("theme");
  return theme ? theme : "light";

}

export const setTheme = async (theme) => {

  await storageSet("theme", theme);

}

export const themeParams = (theme) => {

  let bgColor = "#fff";
  let color = "#333";
  let isDark = false;

  if (theme === "dark") {
    bgColor = "#000";
    color = "#fff";
    isDark = true;
  }

  let isLight = !isDark;

  return {
    bgColor,
    color,
    isDark,
    isLight
  }

}

export const loadTheme = async (ctx, setCtx) => {

    const theme = await getTheme();

    const { bgColor, color, isDark, isLight } = themeParams(theme);

    setCtx({...ctx,
      theme,
      bgColor,
      color,
      isDark,
      isLight
    });

}
