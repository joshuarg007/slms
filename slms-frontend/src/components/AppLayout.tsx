// src/components/AppLayout.tsx
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
