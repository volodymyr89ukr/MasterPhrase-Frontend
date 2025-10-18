import React, { useRef, useState, useEffect } from "react";
import { KeySpec } from "../types";

interface KeyProps {
  spec: KeySpec;
  shift: boolean;
  onPress: (spec: KeySpec) => void;
  onLongPress?: (options: string[]) => void;
}

const LONG_PRESS_DELAY = 350;

export default function Key({ spec, shift, onPress, onLongPress }: KeyProps) {
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
          onLongPress?.(spec.longPress!);
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

  const baseClass =
    "rounded-2xl px-3 py-2 font-semibold shadow-sm select-none transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const colorClass = isAction
    ? "bg-secondary text-secondary-foreground hover:bg-accent"
    : "bg-card text-foreground hover:bg-accent";
  const shiftClass = isShift && shift ? "ring-2 ring-primary" : "";
  const spaceClass = isSpace ? "col-span-4" : "";
  const enterClass = isEnter ? "col-span-2" : "";
  const backspaceClass = isBackspace ? "col-span-1" : "";

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={
        spec.type === "char"
          ? `letter ${displayLabel}`
          : spec.action.toLowerCase()
      }
      className={`${baseClass} ${colorClass} ${shiftClass} ${spaceClass} ${enterClass} ${backspaceClass}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {displayLabel}
    </button>
  );
}
