import { KeyboardLayout } from "../types";

// Special characters row for German
const specialRow = [
  { type: "char" as const, label: "ä", value: "ä" },
  { type: "char" as const, label: "ö", value: "ö" },
  { type: "char" as const, label: "ü", value: "ü" },
  { type: "char" as const, label: "ß", value: "ß" },
];

export const deLayout: KeyboardLayout = {
  id: "de",
  displayName: "Deutsch",
  rows: [
    // Special characters row (only for German)
    specialRow,
    // Row 1: QWERTZ...
    [
      { type: "char", label: "q" },
      { type: "char", label: "w" },
      { type: "char", label: "e" },
      { type: "char", label: "r" },
      { type: "char", label: "t" },
      { type: "char", label: "z" },
      { type: "char", label: "u" },
      { type: "char", label: "i" },
      { type: "char", label: "o" },
      { type: "char", label: "p" },
    ],
    // Row 2: ASDF...
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
    // Row 3: Shift + letters
    [
      { type: "action", label: "⇧", action: "Shift" },
      { type: "char", label: "y" },
      { type: "char", label: "x" },
      { type: "char", label: "c" },
      { type: "char", label: "v" },
      { type: "char", label: "b" },
      { type: "char", label: "n" },
      { type: "char", label: "m" },
      { type: "action", label: "⌫", action: "Backspace" },
    ],
    // Row 4: Service keys
    [
      { type: "action", label: "123", action: "Symbols" },
      { type: "action", label: "🌐", action: "Switch" },
      { type: "action", label: "Space", action: "Space" },
      { type: "action", label: "↵", action: "Enter" },
    ],
  ],
  transform: {
    autoCapitalizeSentence: true,
  },
};
