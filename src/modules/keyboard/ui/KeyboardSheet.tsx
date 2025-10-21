import React from "react";
import { useKeyboardAutosize, DensityTier } from "../hooks/useKeyboardAutosize";

interface KeyboardSheetProps {
  children: React.ReactNode;
  visible?: boolean;
  onDensityChange?: (tier: DensityTier) => void;
}

export default function KeyboardSheet({
  children,
  visible = true,
  onDensityChange,
}: KeyboardSheetProps) {
  const tier = useKeyboardAutosize(12);

  React.useEffect(() => {
    if (onDensityChange) {
      onDensityChange(tier);
    }
  }, [tier, onDensityChange]);
  if (!visible) return null;

  return (
    <div
      data-tier={tier}
      className="kbd-sheet fixed left-0 right-0 bottom-0 z-30 bg-[#0E1116]/96 backdrop-blur-sm pt-1 pb-[env(safe-area-inset-bottom)] overflow-y-auto overscroll-contain"
      style={{
        maxHeight: "var(--kbd-sheet-max, 45dvh)",
        contain: "layout paint",
        touchAction: "pan-y",
      }}
    >
      {children}
    </div>
  );
}
