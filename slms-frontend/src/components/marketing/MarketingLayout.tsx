import { Outlet } from "react-router-dom";
import MarketingHeader from "./MarketingHeader";
import MarketingFooter from "./MarketingFooter";
import { SkipLink } from "@/components/Accessibility";

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Skip Link for keyboard users */}
      <SkipLink targetId="main-content">Skip to main content</SkipLink>

      <MarketingHeader />
      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
