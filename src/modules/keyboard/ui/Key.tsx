import React, { useRef, useState, useEffect } from "react";
import { KeySpec } from "../types";

interface KeyProps {
  spec: KeySpec;
  shift: boolean;
  onPress: (spec: KeySpec) => void;
  onLongPress?: (options: string[], rect: DOMRect) => void;
  density?: "comfort" | "compact" | "ultra";
}

const LONG_PRESS_DELAY = 350;

// SVG Icons
const ShiftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const BackspaceIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6" />
  </svg>
);

const EnterIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H6M12 5l-7 7 7 7" />
  </svg>
);

export default function Key({
  spec,
  shift,
  onPress,
  onLongPress,
  density = "comfort",
}: KeyProps) {
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setPressing(true);

    if (spec.type === "char" && spec.longPress && spec.longPress.length > 0) {
      timerRef.current = window.setTimeout(() => {
        if (buttonRef.current) {
          const r = buttonRef.current.getBoundingClientRect();
          setRect(r);
          onLongPress?.(spec.longPress!, r); // ✅ Передаємо rect
        }
      }, LONG_PRESS_DELAY);
    }
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pressing && !rect) {
      onPress(spec);
    }
    setPressing(false);
    setRect(null);
  };

  const handlePointerCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
    setRect(null);
  };

  let displayLabel = spec.type === "char" ? spec.label : spec.label || "";
  if (spec.type === "char" && shift && /^[a-z]$/.test(spec.label)) {
    displayLabel = spec.label.toUpperCase();
  }

  const isAction = spec.type === "action";
  const isShift = isAction && spec.action === "Shift";
  const isSpace = isAction && spec.action === "Space";
  const isEnter = isAction && spec.action === "Enter";
  const isBackspace = isAction && spec.action === "Backspace";
  const isSymbols = isAction && spec.action === "Symbols";
  const isSwitch = isAction && spec.action === "Switch";

  const baseClass = `kbd-key relative rounded-2xl font-semibold select-none transition-all active:scale-95 focus:outline-none shadow-md ring-1 ring-white/10 active:ring-2 active:ring-blue-400`;
  const colorClass = isAction
    ? "bg-[#1A1F24] text-white"
    : "bg-[#1C2127] text-white";

  const shiftClass = isShift && shift ? "ring-2 ring-blue-500" : "";
  const spaceClass = isSpace ? "kbd-key-space" : "";
  const wideClass =
    isEnter || isBackspace || isSymbols || isSwitch ? "kbd-key-wide" : "";

  // Icons for action keys
  let icon = null;
  if (isShift) icon = <ShiftIcon />;
  if (isBackspace) icon = <BackspaceIcon />;
  if (isEnter) icon = <EnterIcon />;

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={
        spec.type === "char"
          ? `letter ${displayLabel}`
          : spec.action.toLowerCase()
      }
      className={`${baseClass} ${colorClass} ${shiftClass} ${spaceClass} ${wideClass}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ contain: "layout paint" }}
    >
      {/* Invisible hit area */}
      <span className="absolute -inset-2" aria-hidden="true" />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-1">
        {icon}
        {!icon && displayLabel}
      </span>
    </button>
  );
}
