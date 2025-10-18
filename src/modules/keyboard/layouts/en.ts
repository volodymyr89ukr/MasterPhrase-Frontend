import { KeyboardLayout } from "../types";

export const enLayout: KeyboardLayout = {
  id: "en",
  displayName: "English",
  rows: [
    [
      { type: "char", label: "q" },
      { type: "char", label: "w" },
      { type: "char", label: "e" },
      { type: "char", label: "r" },
      { type: "char", label: "t" },
      { type: "char", label: "y" },
      { type: "char", label: "u" },
      { type: "char", label: "i" },
      { type: "char", label: "o" },
      { type: "char", label: "p" },
    ],
    [
      { type: "char", label: "a" },
      { type: "char", label: "s" },
      { type: "char", label: "d" },
      { type: "char", label: "f" },
      { type: "char", label: "g" },
      { type: "char", label: "h" },
      { type: "char", label: "j" },
      { type: "char", label: "k" },
      { type: "char", label: "l" },
    ],
    [
      { type: "action", action: "Shift", label: "⇧" },
      { type: "char", label: "z" },
      { type: "char", label: "x" },
      { type: "char", label: "c" },
      { type: "char", label: "v" },
      { type: "char", label: "b" },
      { type: "char", label: "n" },
      { type: "char", label: "m" },
      { type: "action", action: "Backspace", label: "⌫" },
    ],
    [
      { type: "action", action: "Symbols", label: "123" },
      { type: "action", action: "Switch", label: "🌐" },
      { type: "action", action: "Space", label: "space" },
      { type: "action", action: "Enter", label: "↵" },
    ],
  ],
  transform: {
    autoCapitalizeSentence: true,
  },
};
