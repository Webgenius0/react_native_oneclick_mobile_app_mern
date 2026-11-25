import { storageGet, storageSet } from "./storage";

export const getTheme = async () => {

  const theme = await storageGet("theme");
  return theme ? theme : "light";

}

export const setTheme = async (theme) => {

  await storageSet("theme", theme);

}

export const themeParams = (theme) => {
  let bgColor = "#FFFFFF";
  let color = "#111827";
  let isDark = false;

  if (theme === "dark") {
    bgColor = "#111827";
    color = "#F9FAFB";
    isDark = true;
  }

  let isLight = !isDark;

  return {
    bgColor,
    backgroundColor: bgColor,
    color,
    isDark,
    isLight
  };
};

export const loadTheme = async (ctx, setCtx) => {

    const theme = await getTheme();

    const { bgColor, color, isDark, isLight } = themeParams(theme);

    // Functional update: `ctx` may be stale by the time storage resolves.
    setCtx(prev => {
      if (
        prev.theme === theme &&
        prev.bgColor === bgColor &&
        prev.color === color
      ) {
        return prev;
      }
      return { ...prev, theme, bgColor, color, isDark, isLight };
    });

}
