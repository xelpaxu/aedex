import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceElevated: string;
  border: string;
  borderBright: string;
  text: string;
  textSub: string;
  textDim: string;
  accent: string;
  accentGlow: string;
  danger: string;
  dangerGlow: string;
  safe: string;
  safeGlow: string;
  warn: string;
  warnGlow: string;
  gold: string;
}

export const darkColors: ThemeColors = {
  bg: "#0B0E14",
  surface: "#111520",
  surfaceRaised: "#161C2D",
  surfaceElevated: "#1A2035",
  border: "#1E2640",
  borderBright: "#2E3A5C",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF720",
  danger: "#FF4D6A",
  dangerGlow: "#FF4D6A18",
  safe: "#00C896",
  safeGlow: "#00C89618",
  warn: "#F5A623",
  warnGlow: "#F5A62318",
  gold: "#FFD166",
};

export const lightColors: ThemeColors = {
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceRaised: "#EBF0F9",
  surfaceElevated: "#E2E8F5",
  border: "#D5DFEE",
  borderBright: "#CBD5E1",
  text: "#0F172A",
  textSub: "#475569",
  textDim: "#94A3B8",
  accent: "#2563EB",
  accentGlow: "#2563EB18",
  danger: "#E11D48",
  dangerGlow: "#E11D4818",
  safe: "#059669",
  safeGlow: "#05966918",
  warn: "#D97706",
  warnGlow: "#D9770618",
  gold: "#D97706",
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  isDark: true,
  colors: darkColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "AEDEX_THEME_MODE";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(console.error);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
