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
    const handleClickOutside = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside, true);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };
  }, [onClose]);

  // Calculate position
  const popoverHeight = 68;
  const top = Math.max(8, anchorRect.top - popoverHeight);
  const left = anchorRect.left + anchorRect.width / 2;

  // Ensure popover doesn't overflow viewport
  const viewportWidth = window.innerWidth;
  const estimatedWidth = options.length * 52; // 44px + 8px gap
  const maxLeft = viewportWidth - estimatedWidth / 2 - 8;
  const minLeft = estimatedWidth / 2 + 8;
  const adjustedLeft = Math.max(minLeft, Math.min(left, maxLeft));

  return (
    <div
      ref={ref}
      className="fixed z-[60] flex gap-1.5 p-2 bg-[#1C1F26] rounded-xl shadow-2xl border-2 border-blue-500/30"
      style={{
        top: `${top}px`,
        left: `${adjustedLeft}px`,
        transform: "translateX(-50%)",
        contain: "layout paint",
      }}
    >
      {options.map((opt, idx) => (
        <button
          key={`${opt}-${idx}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(opt);
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="min-w-[44px] h-12 px-3 rounded-lg bg-[#1A1F24] hover:bg-[#252A31] active:bg-[#2A3038] text-white font-semibold text-lg shadow-md transition-all active:scale-95 ring-1 ring-white/10 touch-manipulation"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
