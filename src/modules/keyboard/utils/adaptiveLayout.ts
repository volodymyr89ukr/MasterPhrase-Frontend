import { KeyboardLayout, KeySpec } from "../types";

export function getAdaptiveRows(
  layout: KeyboardLayout,
  isNarrow: boolean
): KeySpec[][] {
  // Symbols layout — no changes
  if (layout.id === "symbols") return layout.rows;

  const rows = layout.rows;

  // Check if first row is special characters (DE/ES)
  const hasSpecialRow = rows.length === 5; // 5 rows = special + 4 normal

  if (!hasSpecialRow) {
    // English layout (4 rows) — no special row
    if (isNarrow) {
      const [row1, row2, row3, row4] = rows;
      const remaining = [
        ...row1.slice(9),
        ...row2.slice(9),
        ...row3.slice(1, -1),
      ];
      return [row1.slice(0, 9), row2.slice(0, 9), remaining, row4];
    }
    return rows;
  }

  // DE/ES layout (5 rows) — preserve special row
  const [specialRow, row1, row2, row3, row4] = rows;

  if (isNarrow) {
    const remaining = [
      ...row1.slice(9),
      ...row2.slice(9),
      ...row3.slice(1, -1),
    ];
    return [specialRow, row1.slice(0, 9), row2.slice(0, 9), remaining, row4];
  }

  return rows;
}
