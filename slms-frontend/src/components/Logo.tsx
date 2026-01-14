import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logoLight from "@/assets/site2crm_logo_vector.svg";
import logoDark from "@/assets/site2crm_logo_vector_dark.svg";

// Centralized logo sizing - update here to change everywhere
const LOGO_SIZES = {
  sm: "w-32",   // 128px - for footers, sidebars
  md: "w-40",   // 160px - default
  lg: "w-56",   // 224px - for hero sections, login pages
} as const;

type LogoSize = keyof typeof LOGO_SIZES;

interface LogoProps {
  size?: LogoSize;
  linkTo?: string;
  className?: string;
  inverted?: boolean;    // For use on colored backgrounds (applies CSS invert)
  forceDark?: boolean;   // Always use dark theme logo (for unauthenticated pages)
}

export default function Logo({ size = "md", linkTo, className = "", inverted = false, forceDark = false }: LogoProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Determine which logo to use
  const logoSrc = forceDark || isDarkMode ? logoDark : logoLight;

  const img = (
    <img
      src={logoSrc}
      alt="Site2CRM"
      className={`${LOGO_SIZES[size]} ${inverted ? "brightness-0 invert" : ""} ${className}`}
    />
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center">
        {img}
      </Link>
    );
  }

  return img;
}

export { logoLight, logoDark, LOGO_SIZES };
