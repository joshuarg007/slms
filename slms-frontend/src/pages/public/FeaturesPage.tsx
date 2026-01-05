import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

// Feature media assets
import features1Video from "@/assets/features1.webm";
import features2Video from "@/assets/features2.webm";
import features3Video from "@/assets/features3.webm";
import features4Image from "@/assets/features4.png";

const FEATURE_SECTIONS = [
  {
    title: "Beautiful Multi-Step Forms",
    description:
      "Guide your visitors through a seamless, wizard-style experience that dramatically increases completion rates.",
    features: [
      {
        title: "Progress Indicators",
        description: "Visual progress bars keep users engaged and motivated to complete the form.",
      },
      {
        title: "Smart Field Validation",
        description: "Real-time validation catches errors before submission, reducing frustration.",
      },
      {
        title: "Mobile Optimized",
        description: "Forms look and work beautifully on any device, from phones to desktops.",
      },
      {
        title: "Review Step",
        description: "Let users review their information before submitting for accuracy.",
      },
    ],
    media: { type: "video" as const, src: features1Video },
  },
  {
    title: "Powerful CRM Integrations",
    description:
      "Connect to the CRMs your team already uses. Leads sync automatically in real-time.",
    features: [
      {
        title: "HubSpot",
        description: "Create contacts, deals, and custom properties directly in HubSpot.",
      },
      {
        title: "Salesforce",
        description: "Push leads to Salesforce with field mapping and custom objects.",
      },
      {
        title: "Pipedrive",
        description: "Add people, organizations, and deals to your Pipedrive pipeline.",
      },
      {
        title: "Nutshell",
        description: "Sync leads and companies to Nutshell automatically.",
      },
    ],
    media: { type: "video" as const, src: features2Video },
  },
  {
    title: "Complete Customization",
    description:
      "Make your forms match your brand perfectly. No design skills required.",
    features: [
      {
        title: "Custom Fields",
        description: "Add dropdowns, checkboxes, text areas, file uploads, and more.",
      },
      {
        title: "Brand Colors",
        description: "Match your website's color scheme with our visual style editor.",
      },
      {
        title: "Custom Labels",
        description: "Write your own field labels, placeholders, and button text.",
      },
      {
        title: "Embed Anywhere",
        description: "One line of code works on WordPress, Webflow, Squarespace, and custom sites.",
      },
    ],
    media: { type: "video" as const, src: features3Video },
  },
  {
    title: "Analytics & Insights",
    description:
      "Understand your lead flow and optimize your forms for maximum conversions.",
    features: [
      {
        title: "Conversion Tracking",
        description: "See how many visitors start and complete your forms.",
      },
      {
        title: "Lead Sources",
        description: "Track where your leads come from with UTM parameter capture.",
      },
      {
        title: "Field Analytics",
        description: "Identify which fields cause drop-offs so you can optimize.",
      },
      {
        title: "Export Reports",
        description: "Download your data as CSV for further analysis.",
      },
    ],
    media: { type: "image" as const, src: features4Image },
  },
];

const ADDITIONAL_FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant Notifications",
    description: "Get email or SMS alerts the moment a new lead comes in.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Enterprise Security",
    description: "SOC 2 compliant with encryption at rest and in transit.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team Management",
    description: "Invite team members with role-based access controls.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Auto-Retry Sync",
    description: "Failed syncs automatically retry so you never lose a lead.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    title: "White Label",
    description: "Remove Site2CRM branding on Professional and Enterprise plans.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "Developer API",
    description: "Full REST API for custom integrations and automation.",
  },
];

export default function FeaturesPage() {
  useSEO({
    title: "Features - Multi-Step Forms, CRM Sync & Analytics",
    description:
      "Explore Site2CRM features: beautiful multi-step forms, instant CRM sync to HubSpot/Salesforce/Pipedrive, real-time analytics, custom fields, and team collaboration.",
    path: "/features",
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Everything You Need to Capture More Leads
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Powerful features that help you convert website visitors into CRM contacts, automatically.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section, index) => (
        <section
          key={section.title}
          className={`py-20 ${index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900"}`}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
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
                <div className="rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-gray-200 dark:border-gray-700">
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
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            And Much More
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {ADDITIONAL_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
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
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to See It in Action?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Start your free trial today. No credit card required.
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
