import React, { useState, useEffect, useMemo } from "react";
import { KeySpec, KeyboardLayout } from "../types";
import Key from "./Key";
import LongPressPopover from "./LongPressPopover";

interface CustomKeyboardProps {
  layout: KeyboardLayout;
  shift: boolean;
  onKey: (spec: KeySpec) => void;
  onSelectVariant?: (variant: string) => void;
  density?: "comfort" | "compact" | "ultra";
  className?: string;
}

function getAdaptiveRows(
  layout: KeyboardLayout,
  isNarrow: boolean
): KeySpec[][] {
  if (layout.id === "symbols") return layout.rows;

  const [row1, row2, row3, row4] = layout.rows;

  if (isNarrow) {
    // 9/9/rest layout for narrow screens
    const remaining = [
      ...row1.slice(9),
      ...row2.slice(9),
      ...row3.slice(1, -1),
    ];
    return [row1.slice(0, 9), row2.slice(0, 9), remaining, row4];
  }

  return layout.rows;
}

export default function CustomKeyboard({
  layout,
  shift,
  onKey,
  onSelectVariant,
  density = "comfort",
  className = "",
}: CustomKeyboardProps) {
  const [popover, setPopover] = useState<{
    options: string[];
    rect: DOMRect;
  } | null>(null);

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

  const handleLongPress = (options: string[], rect: DOMRect) => {
    setPopover({ options, rect });
  };

  const handleSelectVariant = (variant: string) => {
    onSelectVariant?.(variant);
    setPopover(null);
  };

  const handleClosePopover = () => {
    setPopover(null);
  };
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
                onLongPress={(opts, rect) => {
                  handleLongPress(opts, rect);
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {popover && (
        <LongPressPopover
          options={popover.options}
          anchorRect={popover.rect}
          onSelect={handleSelectVariant}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
}
