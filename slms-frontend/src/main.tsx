// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/context/AuthProvider";

const rootEl = document.getElementById("root");

if (!rootEl) {
  // Loud error if index.html is missing #root
  document.body.innerHTML =
    '<div style="padding:16px;font:14px system-ui;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">' +
    "<b>App bootstrap error:</b> No <code>#root</code> element found in <code>index.html</code>." +
    "</div>";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}
