// src/components/Navbar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { logout } from "../utils/auth";

const Navbar: React.FC = () => {
  const location = useLocation();

  // Hide navbar on login/signup pages
  const hideOnRoutes = ["/login", "/signup"];
  if (hideOnRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="bg-indigo-700 text-white px-6 py-4 shadow-md flex justify-between items-center">
      <div className="text-lg font-bold">
        <Link to="/dashboard" className="hover:underline">
          SLMS Dashboard
        </Link>
      </div>
      <div className="space-x-4">
        <Link to="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <Link to="/leads" className="hover:underline">
          Leads
        </Link>
        <Link to="/widget-test" className="hover:underline">
          Test Widget
        </Link>
        <button
          onClick={logout}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
