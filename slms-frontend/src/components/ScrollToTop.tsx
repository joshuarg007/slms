import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top of page on route change
 * Uses useLayoutEffect to scroll before browser paint
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  // useLayoutEffect runs synchronously before browser paint
  // This prevents the flash of content at wrong scroll position
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
