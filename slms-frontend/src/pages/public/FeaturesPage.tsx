import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

// Feature media assets
import features1Video from "@/assets/features1.webm";
import features2Video from "@/assets/features2.webm";
import features3Video from "@/assets/features3.webm";
import features3Video from "@/assets/features3.webm";

const FEATURE_SECTIONS = [
  {
    title: "Site2CRM AI",
    description:
      "AI chat agents that qualify leads on your website 24/7. Set a goal, choose a persistence level, and let the AI handle the rest.",
    features: [
      {
        title: "Goal-Driven Conversations",
        description: "Choose what you want the AI to do — capture emails, book demos, start trials, or collect quotes. Each goal gets its own conversation flow.",
      },
      {
        title: "Persistent Sales AI",
        description: "Your AI doesn't give up after one 'no.' Set how persistent it should be — up to 5 follow-ups before gracefully backing off.",
      },
      {
        title: "Industry Templates",
        description: "Ready-to-go conversation templates for SaaS, Agency, E-commerce, and more. Get started in minutes, not hours.",
      },
      {
        title: "Full Branding Control",
        description: "Match your brand exactly — custom colors, headers, button styles, quick-reply prompts, and welcome messages.",
      },
    ],
    media: { type: "video" as const, src: features1Video },
  },
  {
    title: "Beautiful Multi-Step Forms",
    description:
      "Multi-step forms that guide visitors through a smooth completion flow. Built-in validation and analytics so you know exactly where leads drop off.",
    features: [
      {
        title: "Progress Indicators",
        description: "Show visitors exactly where they are in the form. Reduces drop-off and keeps people moving forward.",
      },
      {
        title: "Smart Field Validation",
        description: "Catch errors as visitors type — no more submitting a form just to find out something's wrong.",
      },
      {
        title: "Mobile Optimized",
        description: "Looks great on every screen. Forms adapt automatically to phones, tablets, and desktops.",
      },
      {
        title: "Review Step",
        description: "Let visitors review everything before they hit submit. Fewer mistakes, higher quality leads.",
      },
    ],
    media: { type: "video" as const, src: features2Video },
  },
  {
    title: "Powerful CRM Integrations",
    description:
      "Every lead syncs to your CRM the moment it's captured. If something fails, we retry automatically. Zero leads lost.",
    features: [
      {
        title: "HubSpot",
        description: "Sync leads directly to HubSpot contacts, deals, and custom properties. Map any field you need.",
      },
      {
        title: "Salesforce",
        description: "Push leads straight into Salesforce with custom field mapping and automatic deduplication.",
      },
      {
        title: "Pipedrive",
        description: "Create persons, organizations, and deals in Pipedrive automatically. Leads land right in your pipeline.",
      },
      {
        title: "Zoho CRM",
        description: "Native Zoho CRM integration with flexible field mapping. Leads appear exactly where you need them.",
      },
      {
        title: "Nutshell",
        description: "Leads and companies sync to Nutshell in real-time. Set it up once, never think about it again.",
      },
    ],
    media: { type: "video" as const, src: features3Video },
  },
  {
    title: "Complete Customization",
    description:
      "Make it yours. Customize every detail to match your brand — colors, labels, fields, and more.",
    features: [
      {
        title: "Custom Fields",
        description: "Add dropdowns, checkboxes, text areas, file uploads, and more. Build the exact form you need.",
      },
      {
        title: "Brand Colors",
        description: "Pick your exact brand colors with a visual editor and see changes in real-time.",
      },
      {
        title: "Custom Labels",
        description: "Change any label, placeholder, button text, or error message to say exactly what you want.",
      },
      {
        title: "Embed Anywhere",
        description: "One line of code. Works with WordPress, Webflow, Squarespace, or any website.",
      },
    ],
    media: { type: "video" as const, src: features3Video },
  },
  {
    title: "Analytics & Insights",
    description:
      "See exactly what's working. Track conversions, lead sources, and where visitors drop off — all in one dashboard.",
    features: [
      {
        title: "Conversion Tracking",
        description: "See your full funnel — from first impression to completed submission. Know your conversion rate at every step.",
      },
      {
        title: "Lead Sources",
        description: "Automatically track where your leads come from — UTMs, referrers, and channels all captured.",
      },
      {
        title: "Field Analytics",
        description: "Find out which fields cause visitors to leave. Fix the friction, capture more leads.",
      },
      {
        title: "Export Reports",
        description: "Export your data as CSV anytime. Use it in spreadsheets, BI tools, or for your records.",
      },
    ],
    media: { type: "video" as const, src: features1Video },
  },
];

const ADDITIONAL_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "AI Chat Agents",
    description: "Run multiple AI agents on your site, each with its own goal — demos, trials, quotes, or email capture.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Persistent AI Sales",
    description: "Your AI handles objections like a real salesperson — up to 5 follow-ups before politely stepping back.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant Notifications",
    description: "Get notified the instant a lead comes in — by email or webhook. Never miss an opportunity.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Enterprise Security",
    description: "Your data is encrypted, SOC 2 compliant, and never sold. Enterprise-ready from day one.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team Management",
    description: "Invite your team and control who can see, edit, or manage leads and settings.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Auto-Retry Sync",
    description: "If a CRM sync fails, we retry automatically until it goes through. Zero data loss, guaranteed.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    title: "White Label",
    description: "Remove Site2CRM branding on PRO and Enterprise plans. Your forms, your brand.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "Developer API",
    description: "Full REST API with documentation. Build custom integrations or connect to your own tools.",
  },
];

export default function FeaturesPage() {
  useSEO({
    title: "Features — AI Chat Agents, Lead Forms & CRM Sync | Site2CRM",
    description:
      "Site2CRM features: AI chat agents that capture leads 24/7, multi-step forms, and real-time CRM sync to HubSpot, Salesforce, Pipedrive, Zoho. 14-day free trial.",
    path: "/features",
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-violet-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            The Site2CRM Platform
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            AI chat agents, multi-step forms, and real-time CRM sync — everything you need to capture and convert more leads.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section, index) => (
        <section
          key={section.title}
          className={`py-12 sm:py-20 ${index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900"}`}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className={`grid lg:grid-cols-2 gap-8 sm:gap-12 items-center ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  {section.description}
                </p>

                <div className="mt-8 grid sm:grid-cols-2 gap-6">
                  {section.features.map((feature) => (
                    <div key={feature.title}>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                {/* Feature media - video or image */}
                <div className="rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/10 border border-gray-200 dark:border-gray-700">
                  {section.media.type === "video" ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto"
                    >
                      <source src={section.media.src} type="video/webm" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={section.media.src}
                      alt={section.title}
                      className="w-full h-auto"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Additional Features Grid */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 sm:mb-12">
            Everything You Need
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {ADDITIONAL_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  {feature.icon}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-violet-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Experience the Platform
          </h2>
          <p className="mt-4 text-lg text-violet-100">
            14-day trial. Full platform access. No credit card required.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl bg-white text-violet-600 hover:bg-violet-50 shadow-lg transition-all flex items-center justify-center"
            >
              Start Free Trial
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
