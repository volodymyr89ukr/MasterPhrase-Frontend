import React, { useState, useEffect, useMemo } from "react";
import { KeySpec, KeyboardLayout } from "../types";
import Key from "./Key";
import { getAdaptiveRows } from "../utils/adaptiveLayout";

interface CustomKeyboardProps {
  layout: KeyboardLayout;
  shift: boolean;
  onKey: (spec: KeySpec) => void;
  density?: "comfort" | "compact" | "ultra";
  className?: string;
}

export default function CustomKeyboard({
  layout,
  shift,
  onKey,
  density = "comfort",
  className = "",
}: CustomKeyboardProps) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 359px)");
    setIsNarrow(query.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsNarrow(e.matches);
    };

    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  const adaptiveRows = useMemo(
    () => getAdaptiveRows(layout, isNarrow),
    [layout, isNarrow]
  );

  return (
    <div className={`relative ${className}`}>
      <div
        data-tier={density}
        className="kbd flex flex-col gap-[var(--key-gap)] px-1 pb-2"
        style={{ contain: "layout paint" }}
      >
        {adaptiveRows.map((row, i) => (
          <div key={i} className="kbd-row" style={{ contain: "layout paint" }}>
            {row.map((spec, j) => (
              <Key
                key={j}
                spec={spec}
                shift={shift}
                density={density}
                onPress={onKey}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
