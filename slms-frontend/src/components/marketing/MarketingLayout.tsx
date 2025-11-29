import { Outlet } from "react-router-dom";
import MarketingHeader from "./MarketingHeader";
import MarketingFooter from "./MarketingFooter";

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <MarketingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
