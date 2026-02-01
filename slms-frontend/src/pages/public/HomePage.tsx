import { Link } from "react-router-dom";
import ContactForm from "@/components/marketing/ContactForm";
import { useSEO, schemas } from "@/hooks/useSEO";

// AI-powered features - DISABLED (kept for future use)
// const AI_FEATURES = [...];

// Feature data
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "AI Chat Widget Pro",
    description: "Persistent AI chat that captures leads 24/7. Goal-driven conversations that don't give up after one objection.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    title: "Instant CRM Sync",
    description: "Leads flow directly to your CRM in real-time. HubSpot, Salesforce, Pipedrive, Zoho, and more.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: "Multi-Step Forms",
    description: "Beautiful wizard-style forms that guide users through each field for higher completion rates.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "No Code Required",
    description: "Copy one line of code to your website. Works with any platform - WordPress, Webflow, custom sites.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Analytics Dashboard",
    description: "Track form submissions, chat conversations, and lead sources all in one place.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant Notifications",
    description: "Get notified by email the moment a new lead comes in. Never miss an opportunity.",
  },
];

// CRM logos
const CRM_LOGOS = [
  { name: "HubSpot", color: "#ff7a59" },
  { name: "Salesforce", color: "#00a1e0" },
  { name: "Pipedrive", color: "#1a1a1a" },
  { name: "Zoho CRM", color: "#e42527" },
  { name: "Nutshell", color: "#f5a623" },
];

// How it works steps
const STEPS = [
  {
    number: "1",
    title: "Build Your Form",
    description: "Choose your form style and customize fields in our visual editor.",
  },
  {
    number: "2",
    title: "Embed on Your Site",
    description: "Copy a single line of code and paste it on your website.",
  },
  {
    number: "3",
    title: "Sync to Your CRM",
    description: "Leads automatically appear in your CRM. It's that simple.",
  },
];

export default function HomePage() {
  useSEO({
    title: "AI Chat Widget + Lead Forms with CRM Sync | Site2CRM",
    description:
      "Capture leads 24/7 with our AI Chat Widget Pro and multi-step forms. Persistent AI that handles objections. Syncs to HubSpot, Salesforce, Pipedrive instantly. Start free.",
    path: "/",
    jsonLd: schemas.organization,
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
              AI chat that{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                never gives up
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Your AI sales assistant captures leads 24/7. Unlike basic chatbots, it handles objections, stays persistent, and syncs every lead to your CRM instantly.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                Start Free Trial
              </Link>
              <Link
                to="/features"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                See How It Works
              </Link>
            </div>
            {/* Value props highlight */}
            <div className="mt-12 inline-flex items-center gap-6 px-6 py-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">24/7</div>
                <div className="text-xs text-gray-500">AI chat</div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">5x</div>
                <div className="text-xs text-gray-500">rebuttals</div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">Instant</div>
                <div className="text-xs text-gray-500">CRM sync</div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-100 dark:bg-indigo-900/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-100 dark:bg-purple-900/20 blur-3xl" />
        </div>
      </section>

      {/* Trust logos */}
      <section className="py-12 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
            Trusted by teams using
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {CRM_LOGOS.map((crm) => (
              <div
                key={crm.name}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: crm.color }}
                />
                <span className="text-lg font-semibold">{crm.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat Widget Pro Section */}
      <section className="py-20 bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-indigo-950/30 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                NEW: Chat Widget Pro
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                AI that sells like your best rep
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Most chatbots give up after one "no thanks." Ours doesn't. Configure goals, persistence levels, and let AI handle objections professionally.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { title: "Goal-Driven", desc: "Capture emails, book demos, start trials, or collect quotes" },
                  { title: "Persistent Sales AI", desc: "Up to 5 rebuttals before gracefully backing off" },
                  { title: "Industry Templates", desc: "Pre-built configs for SaaS, Agency, E-commerce" },
                  { title: "Full Branding", desc: "Custom colors, headers, quick replies, and more" },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{item.title}:</span>{" "}
                      <span className="text-gray-600 dark:text-gray-400">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                Try Chat Widget Pro
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="relative">
              {/* Chat widget mockup */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-sm mx-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                  <div className="text-white font-semibold">Chat with us</div>
                  <div className="text-indigo-100 text-sm">We reply instantly</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">Hi! I'd love to show you how we can help. What brings you here today?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                      <p className="text-sm text-white">Just browsing, not interested</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">No pressure at all! Quick question though - are you currently using any CRM? I might have a tip that saves you hours each week.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-400">Type a message...</div>
                  <button className="px-3 py-2 bg-indigo-600 rounded-xl">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-200 dark:bg-indigo-800/30 rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-200 dark:bg-purple-800/30 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-2xl font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Powerful features to capture and convert more leads
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium hover:gap-3 transition-all"
            >
              See all features
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Demo Form Section */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Try It Now
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Experience our multi-step wizard form. This is exactly what your website visitors will see.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Smooth step-by-step experience",
                  "Progress indicator keeps users engaged",
                  "Review step before submission",
                  "Fully customizable fields and styling",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ContactForm
                title="Get a Demo"
                subtitle="See how Site2CRM can help your business."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Get Your Time Back?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
