/**
 * Agent note:
 * This file is a reusable TUI theme definition.
 * Use this theme for terminal UIs, onboarding flows, or CLI screens that should
 * keep this visual style. This file is theme-only and should stay free of app logic.
 */

export type TuiThemeFormat = {
  name: string;
  palette: {
    accent: string;
    accentBright: string;
    info: string;
    success: string;
    warn: string;
    error: string;
    muted: string;
  };
  roles: {
    heading: string;
    accent: string;
    accentBright: string;
    info: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
  frame: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
  };
  layout: {
    minWidth: number;
    maxWidth: number;
  };
};

export const TUI_THEME: TuiThemeFormat = {
  name: "caruso-lobster-tui",
  palette: {
    accent: "#FF5A2D",
    accentBright: "#FF7A3D",
    info: "#2FB7C9",
    success: "#2FBF71",
    warn: "#FFB020",
    error: "#E23D2D",
    muted: "#8B7F77"
  },
  roles: {
    heading: "accent",
    accent: "accent",
    accentBright: "accentBright",
    info: "info",
    success: "success",
    warning: "warn",
    error: "error",
    muted: "muted"
  },
  frame: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│"
  },
  layout: {
    minWidth: 72,
    maxWidth: 120
  }
};
