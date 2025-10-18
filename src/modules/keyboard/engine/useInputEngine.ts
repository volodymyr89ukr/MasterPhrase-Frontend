import { useState, useCallback } from "react";

export type InputEngine = {
  value: string;
  cursor: number;
  shift: boolean;
  symbols: boolean;
  layoutId: "en" | "de" | "es";
  setLayout(id: "en" | "de" | "es"): void;
  insert(ch: string): void;
  backspace(): void;
  enter(): void;
  space(): void;
  moveCursor(by: number): void;
  setShift(on: boolean): void;
  toggleShift(): void;
  setSymbols(on: boolean): void;
  reset(): void;
};

export function useInputEngine(opts?: {
  initial?: string;
  initialLayout?: "en" | "de" | "es";
  onEnter?: (value: string) => void;
}): InputEngine {
  const [value, setValue] = useState(opts?.initial || "");
  const [cursor, setCursor] = useState(opts?.initial?.length || 0);
  const [shift, setShiftState] = useState(false);
  const [symbols, setSymbolsState] = useState(false);
  const [layoutId, setLayoutId] = useState<"en" | "de" | "es">(
    opts?.initialLayout || "en"
  );

  const insert = useCallback(
    (ch: string) => {
      let charToInsert = ch;

      // Apply shift for letters
      if (shift && /^[a-z]$/.test(ch)) {
        charToInsert = ch.toUpperCase();
      } else if (shift && /^[äöüß]$/.test(ch)) {
        // German uppercase
        const map: Record<string, string> = { ä: "Ä", ö: "Ö", ü: "Ü", ß: "ẞ" };
        charToInsert = map[ch] || ch.toUpperCase();
      } else if (shift && /^[áéíóúüñ]$/.test(ch)) {
        // Spanish uppercase
        const map: Record<string, string> = {
          á: "Á",
          é: "É",
          í: "Í",
          ó: "Ó",
          ú: "Ú",
          ü: "Ü",
          ñ: "Ñ",
        };
        charToInsert = map[ch] || ch.toUpperCase();
      }

      setValue((v) => {
        const before = v.slice(0, cursor);
        const after = v.slice(cursor);
        return before + charToInsert + after;
      });
      setCursor((c) => c + 1);

      // Auto-disable shift after one character (not sticky)
      if (shift) setShiftState(false);
    },
    [cursor, shift]
  );

  const backspace = useCallback(() => {
    if (cursor === 0) return;
    setValue((v) => {
      const before = v.slice(0, cursor - 1);
      const after = v.slice(cursor);
      return before + after;
    });
    setCursor((c) => c - 1);
  }, [cursor]);

  const enter = useCallback(() => {
    if (opts?.onEnter) {
      opts.onEnter(value);
    } else {
      // Default: insert newline
      insert("\n");
    }
  }, [value, opts, insert]);

  const space = useCallback(() => {
    insert(" ");
  }, [insert]);

  const moveCursor = useCallback((by: number) => {
    setCursor((c) => Math.max(0, c + by));
  }, []);

  const setShift = useCallback((on: boolean) => {
    setShiftState(on);
  }, []);

  const toggleShift = useCallback(() => {
    setShiftState((s) => !s);
  }, []);

  const setSymbols = useCallback((on: boolean) => {
    setSymbolsState(on);
  }, []);

  const setLayout = useCallback((id: "en" | "de" | "es") => {
    setLayoutId(id);
  }, []);

  const reset = useCallback(() => {
    setValue(opts?.initial || "");
    setCursor(opts?.initial?.length || 0);
    setShiftState(false);
    setSymbolsState(false);
  }, [opts?.initial]);

  return {
    value,
    cursor,
    shift,
    symbols,
    layoutId,
    setLayout,
    insert,
    backspace,
    enter,
    space,
    moveCursor,
    setShift,
    toggleShift,
    setSymbols,
    reset,
  };
}
