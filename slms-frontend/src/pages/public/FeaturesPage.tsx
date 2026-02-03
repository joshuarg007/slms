import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

// Feature media assets
import features1Video from "@/assets/features1.webm";
import features2Video from "@/assets/features2.webm";
import features3Video from "@/assets/features3.webm";
import features4Image from "@/assets/features4.png";

const FEATURE_SECTIONS = [
  {
    title: "Site2CRM AI",
    description:
      "Deploy autonomous AI chat agents that qualify leads 24/7 using goal-driven conversation architecture and configurable persistence strategies.",
    features: [
      {
        title: "Goal-Driven Conversations",
        description: "Define discrete conversion objectives -- email capture, demo booking, trial activation, or quote collection -- each with its own conversation policy.",
      },
      {
        title: "Persistent Sales AI",
        description: "Configurable persistence depth with up to 5 rebuttal layers. The agent handles objections methodically, then disengages on policy.",
      },
      {
        title: "Industry Templates",
        description: "Pre-trained conversation blueprints for SaaS, Agency, E-commerce, and other verticals. Deploy in minutes.",
      },
      {
        title: "Full Branding Control",
        description: "Pixel-level control over colors, headers, button dimensions, quick-reply prompts, and welcome sequences.",
      },
    ],
    media: { type: "video" as const, src: features1Video },
  },
  {
    title: "Beautiful Multi-Step Forms",
    description:
      "Wizard-architecture form engine with step-level analytics and field-level validation, engineered for maximum completion rates.",
    features: [
      {
        title: "Progress Indicators",
        description: "Deterministic progress rendering keeps users oriented and reduces abandonment at every step.",
      },
      {
        title: "Smart Field Validation",
        description: "Inline validation engine catches malformed input pre-submission, eliminating round-trip error states.",
      },
      {
        title: "Mobile Optimized",
        description: "Responsive rendering pipeline adapts layout and touch targets across viewports, from 320px to ultrawide.",
      },
      {
        title: "Review Step",
        description: "Built-in confirmation step lets users audit their input before final submission, reducing error rates.",
      },
    ],
    media: { type: "video" as const, src: features2Video },
  },
  {
    title: "Powerful CRM Integrations",
    description:
      "Real-time bidirectional sync layer with fault-tolerant delivery and automatic retry. Zero leads lost.",
    features: [
      {
        title: "HubSpot",
        description: "Full object mapping to HubSpot contacts, deals, and custom properties with field-level sync control.",
      },
      {
        title: "Salesforce",
        description: "Direct API integration with Salesforce lead and custom object schemas, including field mapping and deduplication.",
      },
      {
        title: "Pipedrive",
        description: "Structured sync to Pipedrive persons, organizations, and deal stages with pipeline-aware routing.",
      },
      {
        title: "Zoho CRM",
        description: "Native Zoho CRM module integration with configurable field mapping and layout-aware record creation.",
      },
      {
        title: "Nutshell",
        description: "Automated lead and company synchronization to Nutshell with real-time delivery.",
      },
    ],
    media: { type: "video" as const, src: features3Video },
  },
  {
    title: "Complete Customization",
    description:
      "Comprehensive theming engine with full visual override capabilities. Precision-match any brand system.",
    features: [
      {
        title: "Custom Fields",
        description: "Extensible field type system: dropdowns, checkboxes, text areas, file uploads, and custom input components.",
      },
      {
        title: "Brand Colors",
        description: "Visual style editor with hex/RGB input, contrast-ratio validation, and live preview rendering.",
      },
      {
        title: "Custom Labels",
        description: "Full copy control over field labels, placeholder text, button copy, and validation messages.",
      },
      {
        title: "Embed Anywhere",
        description: "Single-script embed compatible with WordPress, Webflow, Squarespace, and any custom HTML environment.",
      },
    ],
    media: { type: "video" as const, src: features4Image },
  },
  {
    title: "Analytics & Insights",
    description:
      "Instrumented analytics pipeline with step-level funnel metrics, source attribution, and field-level drop-off analysis.",
    features: [
      {
        title: "Conversion Tracking",
        description: "End-to-end funnel visibility: impression, start, step progression, and completion metrics.",
      },
      {
        title: "Lead Sources",
        description: "Automatic UTM parameter extraction and source attribution across all acquisition channels.",
      },
      {
        title: "Field Analytics",
        description: "Per-field abandonment analysis pinpoints friction points in your capture flow.",
      },
      {
        title: "Export Reports",
        description: "Structured CSV export for offline analysis, BI tool ingestion, or compliance archival.",
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
    description: "Deploy multiple autonomous agents, each with distinct conversion objectives and conversation policies.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Persistent AI Sales",
    description: "Configurable persistence depth with graduated rebuttal strategies and policy-driven disengagement.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant Notifications",
    description: "Sub-second webhook and email notifications on lead capture events.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Enterprise Security",
    description: "SOC 2 compliant infrastructure with AES-256 encryption at rest and TLS 1.3 in transit.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team Management",
    description: "Role-based access control with granular permission scoping per team member.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Auto-Retry Sync",
    description: "Fault-tolerant delivery with exponential backoff retry and dead-letter logging. Zero data loss.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    title: "White Label",
    description: "Full brand removal on PRO and Enterprise tiers. Ship under your own identity.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "Developer API",
    description: "Documented REST API with OAuth 2.0 authentication for programmatic access and custom integrations.",
  },
];

export default function FeaturesPage() {
  useSEO({
    title: "Platform Features — AI Chat Agents, Forms & CRM Integration | Site2CRM",
    description:
      "Site2CRM platform: autonomous AI chat agents with goal-driven conversation architecture, multi-step forms, real-time CRM sync to HubSpot, Salesforce, Pipedrive, Zoho. Built by Axion Deep Labs.",
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
            Research-grade AI chat agents and intelligent form systems, engineered for production environments.
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
            Platform Capabilities
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
