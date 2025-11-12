import React from "react";

export default function App() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Site2CRM</h1>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <a href="/" style={{ textDecoration: "none" }}>Dashboard</a>
          <a href="/leads" style={{ textDecoration: "none" }}>Leads</a>
          <a href="/reports" style={{ textDecoration: "none" }}>Reports</a>
          <a href="/settings" style={{ textDecoration: "none" }}>Settings</a>
        </nav>
      </header>

      <section style={{ padding: "1.25rem", border: "1px solid #eee", borderRadius: 12, marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Deployment OK ✅</h2>
        <p style={{ margin: 0 }}>
          Frontend is now served via <strong>S3 + CloudFront</strong>. You’re seeing the live build.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <Card title="Auth Status">Hook up JWT check and /me ping here.</Card>
        <Card title="Leads">
          Show lead totals, recent imports, and pipeline stage counts.
        </Card>
        <Card title="Reports">
          Add links to /reports/overview and export actions.
        </Card>
        <Card title="System">
          CloudFront ID: <code>E1T0ATNKXI2NS</code><br />
          S3 Bucket: <code>site2crm-frontend-prod</code>
        </Card>
      </section>

      <footer style={{ marginTop: "2rem", color: "#666" }}>
        <small>© {new Date().getFullYear()} Site2CRM • Vite + React • Deployed via GitHub Actions</small>
      </footer>
    </main>
  );
}

function Card({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: "1rem", border: "1px solid #eee", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
