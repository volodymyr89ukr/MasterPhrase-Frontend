import { KeyboardLayout } from "../types";

export const symbolsLayout: KeyboardLayout = {
  id: "symbols",
  displayName: "Symbols",
  rows: [
    [
      { type: "char", label: "1" },
      { type: "char", label: "2" },
      { type: "char", label: "3" },
      { type: "char", label: "4" },
      { type: "char", label: "5" },
      { type: "char", label: "6" },
      { type: "char", label: "7" },
      { type: "char", label: "8" },
      { type: "char", label: "9" },
      { type: "char", label: "0" },
    ],
    [
      { type: "char", label: "-" },
      { type: "char", label: "/" },
      { type: "char", label: ":" },
      { type: "char", label: ";" },
      { type: "char", label: "(" },
      { type: "char", label: ")" },
      { type: "char", label: "$" },
      { type: "char", label: "&" },
      { type: "char", label: "@" },
    ],
    [
      { type: "action", action: "Symbols", label: "ABC" },
      { type: "char", label: "." },
      { type: "char", label: "," },
      { type: "char", label: "?" },
      { type: "char", label: "!" },
      { type: "char", label: "'" },
      { type: "char", label: '"' },
      { type: "action", action: "Backspace", label: "⌫" },
    ],
    [
      { type: "action", action: "Switch", label: "🌐" },
      { type: "action", action: "Space", label: "space" },
      { type: "action", action: "Enter", label: "↵" },
    ],
  ],
};
