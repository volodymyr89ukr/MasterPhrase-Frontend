import React, { useState } from "react";
import { KeySpec, KeyboardLayout } from "../types";
import Key from "./Key";
import LongPressPopover from "./LongPressPopover";

interface CustomKeyboardProps {
  layout: KeyboardLayout;
  shift: boolean;
  onKey: (spec: KeySpec) => void;
  onSelectVariant?: (variant: string) => void;
  className?: string;
}

export default function CustomKeyboard({
  layout,
  shift,
  onKey,
  onSelectVariant,
  className = "",
}: CustomKeyboardProps) {
  const [popover, setPopover] = useState<{
    options: string[];
    rect: DOMRect;
  } | null>(null);

  const handleLongPress = (options: string[], rect: DOMRect) => {
    setPopover({ options, rect });
  };

  const handleSelectVariant = (variant: string) => {
    onSelectVariant?.(variant);
    setPopover(null);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col gap-2 p-4 bg-background border-t border-border">
        {layout.rows.map((row, i) => (
          <div
            key={i}
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                ...layout.rows.map((r) => r.length)
              )}, minmax(0, 1fr))`,
            }}
          >
            {row.map((spec, j) => (
              <Key
                key={j}
                spec={spec}
                shift={shift}
                onPress={onKey}
                onLongPress={(opts) => {
                  const btn = document.activeElement as HTMLButtonElement;
                  if (btn) {
                    handleLongPress(opts, btn.getBoundingClientRect());
                  }
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
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
