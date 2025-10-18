import React, { useEffect, useRef } from "react";

interface LongPressPopoverProps {
  options: string[];
  onSelect: (option: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

export default function LongPressPopover({
  options,
  onSelect,
  onClose,
  anchorRect,
}: LongPressPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [onClose]);

  const top = anchorRect.top - 60;
  const left = anchorRect.left + anchorRect.width / 2;

  return (
    <div
      ref={ref}
      className="fixed z-50 flex gap-1 p-2 bg-card border border-border rounded-xl shadow-lg"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect(opt);
          }}
          className="min-w-[40px] h-10 px-3 rounded-lg bg-secondary hover:bg-accent text-foreground font-semibold shadow transition-colors"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
