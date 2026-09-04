import { useEffect, useState } from "react";

export type DeviceKind = "mobile" | "desktop" | "unknown";

/**
 * "mobile" / "desktop" only when the pointer type and the viewport width agree.
 * Anything ambiguous (touch laptop, narrow desktop window, no matchMedia)
 * resolves to "unknown" so callers can show both sets of instructions.
 */
export const useDeviceKind = (): DeviceKind => {
  const [kind, setKind] = useState<DeviceKind>("unknown");

  useEffect(() => {
    const check = () => {
      if (typeof window.matchMedia !== "function") return setKind("unknown");
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const fine = window.matchMedia("(pointer: fine)").matches;
      const narrow = window.innerWidth < 768;
      if (coarse && !fine && narrow) return setKind("mobile");
      if (fine && !coarse && !narrow) return setKind("desktop");
      return setKind("unknown");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return kind;
};
