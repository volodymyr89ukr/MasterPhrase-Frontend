import React from "react";

interface KeyboardSheetProps {
  children: React.ReactNode;
  visible?: boolean;
}

export default function KeyboardSheet({
  children,
  visible = true,
}: KeyboardSheetProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-30 bg-[#0E1116]/95 backdrop-blur pt-2 mx-2 pb-[env(safe-area-inset-bottom)]"
      style={{ contain: "layout paint" }}
    >
      {children}
    </div>
  );
}
