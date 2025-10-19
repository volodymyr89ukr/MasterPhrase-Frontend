import { KeyboardLayout } from "../types";

// Special characters row for Spanish
const specialRow = [
  { type: "char" as const, label: "ñ", value: "ñ" },
  { type: "char" as const, label: "á", value: "á" },
  { type: "char" as const, label: "é", value: "é" },
  { type: "char" as const, label: "í", value: "í" },
  { type: "char" as const, label: "ó", value: "ó" },
  { type: "char" as const, label: "ú", value: "ú" },
  { type: "char" as const, label: "ü", value: "ü" },
];

export const esLayout: KeyboardLayout = {
  id: "es",
  displayName: "Español",
  rows: [
    [
      { type: "char", label: "q", longPress: [] },
      { type: "char", label: "w", longPress: [] },
      { type: "char", label: "e", longPress: ["é"] },
      { type: "char", label: "r", longPress: [] },
      { type: "char", label: "t", longPress: [] },
      { type: "char", label: "y", longPress: [] },
      { type: "char", label: "u", longPress: ["ú", "ü"] },
      { type: "char", label: "i", longPress: ["í"] },
      { type: "char", label: "o", longPress: ["ó"] },
      { type: "char", label: "p", longPress: [] },
    ],
    [
      { type: "char", label: "a", longPress: ["á"] },
      { type: "char", label: "s", longPress: [] },
      { type: "char", label: "d", longPress: [] },
      { type: "char", label: "f", longPress: [] },
      { type: "char", label: "g", longPress: [] },
      { type: "char", label: "h", longPress: [] },
      { type: "char", label: "j", longPress: [] },
      { type: "char", label: "k", longPress: [] },
      { type: "char", label: "l", longPress: [] },
    ],
    [
      { type: "action", label: "⇧", action: "Shift" },
      { type: "char", label: "z", longPress: [] },
      { type: "char", label: "x", longPress: [] },
      { type: "char", label: "c", longPress: [] },
      { type: "char", label: "v", longPress: [] },
      { type: "char", label: "b", longPress: [] },
      { type: "char", label: "n", longPress: ["ñ"] },
      { type: "char", label: "m", longPress: [] },
      { type: "action", label: "⌫", action: "Backspace" },
    ],
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
