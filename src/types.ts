export interface User {
  id: number;
  email: string;
  username?: string;
  [key: string]: any;
}

export type KeySpec =
  | { type: "char"; label: string; value?: string }
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
