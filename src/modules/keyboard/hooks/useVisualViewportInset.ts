import { useState, useEffect } from "react";

export function useVisualViewportInset() {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const updateInset = () => {
      const viewport = window.visualViewport!;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const inset = Math.max(0, windowHeight - viewportHeight);
      setBottomInset(inset);
    };

    updateInset();
    window.visualViewport.addEventListener("resize", updateInset);
    window.visualViewport.addEventListener("scroll", updateInset);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("scroll", updateInset);
    };
  }, []);

  return { bottomInset };
}
