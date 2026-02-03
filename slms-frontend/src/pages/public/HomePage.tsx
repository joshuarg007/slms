import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ContactForm from "@/components/marketing/ContactForm";
import { useSEO, schemas } from "@/hooks/useSEO";

// Feature data
const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "AI Chat Agents",
    description: "Goal-driven AI that captures leads 24/7 through persistent, intelligent conversation.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    title: "Real-Time CRM Sync",
    description: "Every lead flows directly to your CRM the moment it's captured. Zero manual entry.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: "Multi-Step Forms",
    description: "Step-by-step forms that guide visitors to completion. Built for every device.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "One-Line Embed",
    description: "Deploy on any platform with a single script tag. WordPress, Webflow, custom sites.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Conversion Analytics",
    description: "Track submissions, conversations, and lead sources with full-funnel visibility.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant Alerts",
    description: "Email notifications the moment a lead is captured. Never miss an opportunity.",
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
    number: "01",
    title: "Configure",
    description: "Set your AI agent's goals, persistence level, and conversation style in the dashboard.",
  },
  {
    number: "02",
    title: "Deploy",
    description: "Embed a single line of code on your site. Live in under two minutes.",
  },
  {
    number: "03",
    title: "Capture",
    description: "Leads sync to your CRM in real-time. Your AI agent works around the clock.",
  },
];

// Chat mockup messages for animated demo
const CHAT_MESSAGES = [
  { role: "bot", text: "Hey! I'd love to learn about what you're working on. What brings you here?" },
  { role: "user", text: "Just browsing, not really interested" },
  { role: "bot", text: "No pressure! Quick question though — are you spending time manually entering leads into your CRM? I might save you a few hours this week." },
];

export default function HomePage() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [showTyping, setShowTyping] = useState(false);

  useSEO({
    title: "Site2CRM — AI-Powered Lead Capture & CRM Sync",
    description:
      "AI chat agents and lead forms that sync to your CRM in real-time. Capture leads 24/7 with AI that handles objections. 14-day free trial.",
    path: "/",
    jsonLd: schemas.organization,
  });

  // Animated chat message sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let msgIndex = 0;

    const showNext = () => {
      if (msgIndex >= CHAT_MESSAGES.length) return;
      setShowTyping(true);
      timers.push(
        setTimeout(() => {
          setShowTyping(false);
          msgIndex++;
          setVisibleMessages(msgIndex);
          timers.push(setTimeout(showNext, 1200));
        }, 1400)
      );
    };

    timers.push(setTimeout(showNext, 1500));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div>
      {/* Hero Section — Dark Cinematic */}
      <section className="relative overflow-hidden bg-gray-950 py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left — Copy */}
            <div className="text-center lg:text-left">
              <div className="opacity-0 animate-fade-up">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI-Powered Lead Capture
                </span>
              </div>

              <h1 className="mt-6 sm:mt-8 opacity-0 animate-fade-up-1">
                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-300 tracking-tight leading-tight">
                  Leads captured by
                </span>
                <span
                  className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
                  style={{ textShadow: "0 0 40px rgba(139,92,246,0.3)" }}
                >
                  INTELLIGENT AI
                </span>
                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-300 tracking-tight leading-tight">
                  synced in real-time
                </span>
              </h1>

              <p className="mt-5 sm:mt-6 text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-up-2">
                AI chat agents that qualify leads, handle objections, and never take a day off. Every conversation syncs to your CRM instantly.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center lg:justify-start opacity-0 animate-fade-up-3">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 flex items-center justify-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/features"
                  className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 hover:border-white/30 transition-all flex items-center justify-center"
                >
                  See How It Works
                </Link>
              </div>

              {/* Metrics strip */}
              <div className="mt-8 sm:mt-12 inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 rounded-full bg-white/5 border border-white/10 opacity-0 animate-fade-up-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">24/7</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Always On</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">5x</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Rebuttals</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">&lt;1s</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">CRM Sync</div>
                </div>
              </div>
            </div>

            {/* Right — Animated Chat Mockup */}
            <div className="relative opacity-0 animate-fade-up-2">
              <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-violet-500/10 border border-white/10 overflow-hidden max-w-sm mx-auto">
                {/* Chat header */}
                <div className="bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-3">
                  <div className="text-white font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Site2CRM AI
                  </div>
                  <div className="text-white/60 text-xs ml-4">Online now</div>
                </div>
                {/* Chat messages */}
                <div className="p-4 space-y-3 min-h-[200px]">
                  {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-cyan-600 to-violet-600 rounded-br-sm"
                            : "bg-white/10 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {showTyping && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Input bar */}
                <div className="flex gap-2 px-4 pb-4">
                  <div className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-500">Type a message...</div>
                  <button className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-cyan-600 to-violet-600 rounded-full flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Decorative orbs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-float" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
            </div>
          </div>
        </div>

        {/* Background gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-900/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-900/20 blur-3xl" />
        </div>
      </section>

      {/* Trust logos */}
      <section className="py-10 sm:py-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">
            Integrates with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-12">
            {CRM_LOGOS.map((crm) => (
              <div
                key={crm.name}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: crm.color }}
                />
                <span className="text-base sm:text-lg font-semibold">{crm.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Sales Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-gray-50 via-indigo-50/50 to-violet-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-medium uppercase tracking-wider mb-4">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Site2CRM AI
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                AI That Sells While You Sleep
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400">
                Our AI agents don't follow scripts — they have real conversations, handle objections, and keep pushing toward a goal you set.
              </p>
              <ul className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                {[
                  { title: "Set Your Goal", desc: "Capture emails, book demos, start trials, or collect quotes" },
                  { title: "Handles Objections", desc: "Up to 5 follow-ups before gracefully backing off — like a real salesperson" },
                  { title: "Industry Templates", desc: "Ready-to-go profiles for SaaS, Agency, and E-commerce" },
                  { title: "Full Brand Control", desc: "Custom colors, headers, quick replies, and conversation tone" },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{item.title}</span>
                      <span className="text-gray-600 dark:text-gray-400"> — {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 px-6 py-3 min-h-[44px] text-base font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 transition-all"
              >
                Try Site2CRM AI
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="relative">
              {/* Static chat demo for this section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-sm mx-auto">
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3">
                  <div className="text-white font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    Site2CRM AI
                  </div>
                  <div className="text-white/70 text-xs ml-4">Typically replies instantly</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">Hi! I'd love to show you how we can help. What brings you here today?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-white">Not interested, just looking</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">No pressure at all! Quick question though — are you currently entering leads into your CRM by hand? I might save you a few hours this week.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-200 dark:bg-violet-800/30 rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-fuchsia-200 dark:bg-fuchsia-800/30 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative">
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-cyan-500 to-violet-500" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white text-lg sm:text-xl font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything You Need */}
      <section className="py-12 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Everything You Need
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400">
              Powerful features to capture and convert more leads
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3 sm:mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 sm:mt-12 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium hover:gap-3 transition-all"
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
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                See It Live
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400">
                This is the exact multi-step form your visitors will interact with. Try it yourself.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Guided step-by-step completion flow",
                  "Progress indicator for user engagement",
                  "Review step before final submission",
                  "Fully customizable fields and styling",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                    <svg className="w-5 h-5 text-violet-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ContactForm
                title="Request Access"
                subtitle="See how Site2CRM fits your workflow."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Capture More Leads?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-400">
            14-day free trial. No credit card required. Set up in under 5 minutes.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center"
            >
              Start Free Trial
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 hover:border-white/30 transition-all flex items-center justify-center"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
