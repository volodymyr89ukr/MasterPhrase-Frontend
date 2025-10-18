export type KeySpec =
  | { type: "char"; label: string; value?: string; longPress?: string[] }
  | {
      type: "action";
      action: "Backspace" | "Enter" | "Space" | "Shift" | "Switch" | "Symbols";
      label?: string;
    };

export type KeyboardLayout = {
  id: "en" | "de" | "es" | "symbols";
  displayName: string;
  rows: KeySpec[][];
  transform?: {
    autoCapitalizeSentence?: boolean;
  };
};
