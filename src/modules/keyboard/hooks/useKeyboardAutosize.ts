import { useEffect, useState } from "react";

export type DensityTier = "comfort" | "compact" | "ultra";

const HEIGHT_MAP = { comfort: 56, compact: 50, ultra: 44 };
const GAP_MAP = { comfort: 6, compact: 5, ultra: 4 };
const ROWS_COUNT = 4;

export function useKeyboardAutosize(extraPadding = 12): DensityTier {
  const [tier, setTier] = useState<DensityTier>("comfort");

  useEffect(() => {
    const recalculate = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;

      // Get safe-area-inset-bottom
      const safeBottom =
        Number(
          getComputedStyle(document.documentElement)
            .getPropertyValue("padding-bottom")
            .replace("px", "")
        ) || 0;

      // Max keyboard height: 42% of viewport or viewport - content (220px) - safe area
      const maxSheetHeight = Math.min(vh * 0.42, vh - 220 - safeBottom);

      // Calculate required height for each tier
      const calcNeeded = (h: number, g: number) =>
        ROWS_COUNT * h + (ROWS_COUNT - 1) * g + safeBottom + extraPadding;

      // Choose tier that fits
      let newTier: DensityTier;
      if (calcNeeded(HEIGHT_MAP.comfort, GAP_MAP.comfort) <= maxSheetHeight) {
        newTier = "comfort";
      } else if (
        calcNeeded(HEIGHT_MAP.compact, GAP_MAP.compact) <= maxSheetHeight
      ) {
        newTier = "compact";
      } else {
        newTier = "ultra";
      }

      setTier(newTier);

      // Set CSS variable for max height
      document.documentElement.style.setProperty(
        "--kbd-sheet-max",
        `${maxSheetHeight}px`
      );
    };

    recalculate();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", recalculate);
      vv.addEventListener("scroll", recalculate);
    }
    window.addEventListener("orientationchange", recalculate);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", recalculate);
        vv.removeEventListener("scroll", recalculate);
      }
      window.removeEventListener("orientationchange", recalculate);
    };
  }, [extraPadding]);

  return tier;
}
