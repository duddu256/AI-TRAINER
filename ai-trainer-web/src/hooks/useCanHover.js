import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/**
 * True on devices with a real hover-capable pointer (mouse / trackpad).
 * Touch devices report false, so hover-driven effects (3D tilt, parallax)
 * can be skipped there instead of firing on taps and costing frames.
 */
export default function useCanHover() {
  const [canHover, setCanHover] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setCanHover(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return canHover;
}
