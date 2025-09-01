// src/pages/WelcomePage.tsx
import { Link } from "react-router-dom";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <Link to="/welcome" className="text-xl font-semibold">
              SLMS
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <a className="hover:underline" href="#features">Features</a>
              <a className="hover:underline" href="#integrations">Integrations</a>
              <a className="hover:underline" href="#pricing">Pricing</a>
              <Link to="/login" className="rounded-md border px-3 py-1.5 dark:border-gray-700">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-md bg-indigo-600 text-white px-3 py-1.5">
                Get started
              </Link>
            </nav>
          </div>

          <div className="mt-12 max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight">
              Lead capture and sales analytics that actually fit your workflow.
            </h1>
            <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
              Drop in our widget, track performance by source and salesperson, and plug into
              CRMs like HubSpot today—with Pipedrive, Nutshell, and Salesforce on the way.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/signup" className="rounded-md bg-indigo-600 text-white px-5 py-2.5">
                Create account
              </Link>
              <Link to="/login" className="rounded-md border px-5 py-2.5 dark:border-gray-700">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        <Feature title="Lead capture">
          Lightweight form/widget, spam-aware, source tagging.
        </Feature>
        <Feature title="Lead analytics">
          Breakdown by source, trendlines, export to CSV.
        </Feature>
        <Feature title="Salesperson analytics">
          Email/Call/Meeting counts and new deals, with ML scoring coming soon.
        </Feature>
        <Feature title="Integrations">
          HubSpot today; Pipedrive, Nutshell, Salesforce next.
        </Feature>
        <Feature title="Org isolation">
          Multi-tenant API keys for embedded widgets.
        </Feature>
        <Feature title="Dark mode">
          System, light, or dark—your pick.
        </Feature>
      </section>

      {/* Integrations */}
      <section id="integrations" className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-semibold mb-4">Integrations</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="font-medium">HubSpot</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Private app token. Sync salespeople stats and create contacts.
            </div>
          </Card>
          <Card muted>
            <div className="font-medium">Pipedrive • Nutshell • Salesforce</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              On the roadmap. Configurable from Integrations page.
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing (placeholder) */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
        <Card>
          <div className="font-medium">Early access</div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Free during beta. Production plans coming soon.
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} SLMS
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  );
}

function Card({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (muted
          ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900")
      }
    >
      {children}
    </div>
  );
}
