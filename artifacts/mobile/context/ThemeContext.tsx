import React, { createContext, useContext, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";
import { useAuth } from "./AuthContext";

type ThemeColors = typeof Colors.light;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  fontSize: { small: number; medium: number; large: number; xlarge: number };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FONT_SIZES = {
  small: { small: 11, medium: 13, large: 15, xlarge: 18 },
  medium: { small: 12, medium: 15, large: 17, xlarge: 20 },
  large: { small: 13, medium: 17, large: 19, xlarge: 22 },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { user } = useAuth();

  let isDark = systemScheme === "dark";
  if (user?.theme === "dark") isDark = true;
  if (user?.theme === "light") isDark = false;

  const colors = isDark ? Colors.dark : Colors.light;
  const fontSizeKey = (user?.fontSize as keyof typeof FONT_SIZES) || "medium";
  const fontSize = FONT_SIZES[fontSizeKey] || FONT_SIZES.medium;

  return (
    <ThemeContext.Provider value={{ colors, isDark, fontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
