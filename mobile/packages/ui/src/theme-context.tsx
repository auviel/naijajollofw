import { Colors } from "./theme";
import { createContext, useContext } from "react";

export type UiColors = typeof Colors;

const UiThemeContext = createContext<UiColors>(Colors);

export function UiThemeProvider({
  colors,
  children,
}: {
  colors: UiColors;
  children: React.ReactNode;
}) {
  return (
    <UiThemeContext.Provider value={colors}>{children}</UiThemeContext.Provider>
  );
}

export function useUiColors(): UiColors {
  return useContext(UiThemeContext);
}
