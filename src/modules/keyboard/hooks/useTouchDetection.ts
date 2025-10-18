import { useState, useEffect } from "react";

export function useTouchDetection() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [userOverride, setUserOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouchDevice(query.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsTouchDevice(e.matches);
    };

    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  const effectiveTouch = userOverride !== null ? userOverride : isTouchDevice;

  return {
    isTouchDevice: effectiveTouch,
    userOverride,
    setUserOverride,
  };
}
