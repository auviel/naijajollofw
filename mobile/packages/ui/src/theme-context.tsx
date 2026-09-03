import { Colors } from "./theme";
import { createContext, useContext } from "react";

export type UiColors = typeof Colors;
export type UiScheme = "light" | "dark";

type UiThemeValue = {
  colors: UiColors;
  scheme: UiScheme;
};

const UiThemeContext = createContext<UiThemeValue>({
  colors: Colors,
  scheme: "light",
});

export function UiThemeProvider({
  colors,
  scheme = "light",
  children,
}: {
  colors: UiColors;
  scheme?: UiScheme;
  children: React.ReactNode;
}) {
  return (
    <UiThemeContext.Provider value={{ colors, scheme }}>
      {children}
    </UiThemeContext.Provider>
  );
}

export function useUiColors(): UiColors {
  return useContext(UiThemeContext).colors;
}

export function useUiScheme(): UiScheme {
  return useContext(UiThemeContext).scheme;
}

export function useUiTheme(): UiThemeValue {
  return useContext(UiThemeContext);
}
