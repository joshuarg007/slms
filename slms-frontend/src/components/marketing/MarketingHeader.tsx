import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { useTheme, type Theme } from "@/utils/theme";

// Shimmer CTA button - desktop only
function ShimmerLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <Link to={to} className={className} style={{ position: "relative", overflow: "hidden" }}>
      {children}
      {!isMobile && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 75%, transparent 100%)",
            transform: "translateX(-100%) skewX(-15deg)",
            animation: "shimmer-sweep 4s ease-in-out infinite",
            animationDelay: "1s",
            pointerEvents: "none",
          }}
        />
      )}
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          15% { transform: translateX(250%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
      `}</style>
    </Link>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function MarketingHeader() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const themeIcon = theme === "light" ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ) : theme === "dark" ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  );

  const themeLabel = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Add shadow on scroll (debounced)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        role="banner"
        className={`sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-b transition-shadow duration-200 ${
          scrolled
            ? "border-gray-200 dark:border-gray-800 shadow-sm"
            : "border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo linkTo="/" />

            {/* Desktop Nav */}
            <nav role="navigation" aria-label="Main navigation" className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = link.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={cycleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={`Theme: ${themeLabel}`}
              >
                {themeIcon}
              </button>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Log in
              </Link>
              <ShimmerLink
                to="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm"
              >
                Get Started
              </ShimmerLink>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay — outside header to avoid backdrop-filter containing block */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Nav Panel — outside header to avoid backdrop-filter containing block */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        className={`fixed top-16 right-0 bottom-0 w-[90vw] max-w-sm bg-white dark:bg-gray-950 z-[70] md:hidden transform transition-transform duration-300 ease-out overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-xl ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav role="navigation" aria-label="Mobile navigation" className="p-6">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = link.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 min-h-[44px] text-base font-medium rounded-xl transition-colors flex items-center ${
                    isActive
                      ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-3">
            <Link
              to="/login"
              className="px-4 py-3 min-h-[44px] text-base font-medium text-gray-700 dark:text-gray-300 text-center rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-3 min-h-[44px] text-base font-medium text-white bg-violet-600 hover:bg-violet-700 text-center rounded-xl shadow-lg shadow-violet-500/25 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Theme toggle in mobile menu */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={cycleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              {themeIcon}
              <span>Theme: {themeLabel}</span>
            </button>
          </div>

          {/* Quick links in mobile menu */}
          <div className="mt-4 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Legal
            </p>
            <div className="flex flex-col gap-1">
              <Link
                to="/terms"
                className="px-4 py-2.5 min-h-[44px] flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                className="px-4 py-2.5 min-h-[44px] flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
