import { KeyboardLayout, KeySpec } from "../types";

export function getAdaptiveRows(
  layout: KeyboardLayout,
  isNarrow: boolean
): KeySpec[][] {
  if (layout.id === "symbols") return layout.rows;

  // For letter layouts: adjust first two rows
  const [row1, row2, row3, row4] = layout.rows;

  if (isNarrow) {
    // 9 keys per row for narrow screens
    return [
      row1.slice(0, 9), // First 9 letters
      row2.slice(0, 9), // Next 9 letters
      [...row1.slice(9), ...row2.slice(9), ...row3.slice(1, -1)], // Remaining + row3 content
      row4, // Bottom row unchanged
    ];
  }

  // Default: 10/10/9 (or original layout)
  return layout.rows;
}
