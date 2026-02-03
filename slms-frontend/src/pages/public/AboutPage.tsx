import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

const VALUES = [
  {
    title: "Inquiry & Discovery",
    description: "We explore, prototype, and validate new architectures that bridge scientific depth with engineering rigor.",
  },
  {
    title: "Precision Engineering",
    description: "Every system we build is crafted with meticulous attention to detail, reliability, and performance.",
  },
  {
    title: "Data-Driven Insights",
    description: "Analytics are woven into every product we create, from lead scoring to conversion tracking.",
  },
  {
    title: "Transparent Attribution",
    description: "Unlike black-box solutions, we provide full visibility into how and why decisions are made.",
  },
];

const STATS = [
  { label: "Leads Captured", value: "2M+" },
  { label: "AI Conversations", value: "500K+" },
  { label: "Happy Customers", value: "5,000+" },
  { label: "Countries", value: "45+" },
];

// Other AxionDeep products
const AXIONDEEP_PRODUCTS = [
  {
    name: "QUANTA",
    description: "Interactive quantum computing learning platform with visual circuit builder and real-time Bloch sphere visualization.",
    status: "In Development",
    link: null,
  },
  {
    name: "Forma",
    description: "Visual page builder with smart component generation. Drag-and-drop interface with 100+ pre-built components.",
    status: "In Development",
    link: null,
  },
  {
    name: "Quantum Gallery",
    description: "Dynamic 3D scene framework for interactive visualization and procedural animations.",
    status: "Research",
    link: null,
  },
];

export default function AboutPage() {
  useSEO({
    title: "About Us - AI Chat Widget + CRM Lead Capture",
    description:
      "Site2CRM: AI chat widgets and lead forms that sync to your CRM. Built by Axion Deep Labs. Persistent sales AI that handles objections and captures leads 24/7.",
    path: "/about",
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-200 dark:border-cyan-800 mb-4 sm:mb-6">
            <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600">
              An Axion Deep Product
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            About Site2CRM
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            AI chat widgets and lead forms that capture leads 24/7 and sync directly to your CRM. Built with precision engineering and persistent sales AI.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            The Site2CRM Story
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <p>
              Site2CRM combines AI-powered chat widgets with beautiful lead capture forms, all syncing
              directly to your CRM in real-time. Our Site2CRM AI uses goal-driven AI that doesn't
              give up after one objection - it handles rebuttals professionally and persistently.
            </p>
            <p className="mt-4">
              Unlike basic chatbots that fold after a visitor says "not interested," our AI
              continues the conversation naturally. Configure goals like booking demos, starting trials,
              or collecting quotes. The AI pursues your objective while respecting visitor boundaries.
            </p>
            <p className="mt-4">
              We built Site2CRM because we saw the same problem over and over: getting leads from
              a website into a CRM was way harder than it needed to be. Traditional form builders
              were clunky and disconnected. Basic chatbots were too passive.
            </p>
            <p className="mt-4">
              Today, Site2CRM powers lead capture for thousands of businesses around the world,
              with AI chat that works 24/7, smart lead qualification, and complete visibility into every conversation.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="mt-2 text-indigo-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 sm:mb-12">
            Our Values
          </h2>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Join Us on Our Mission
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Whether you're a customer, partner, or future team member, we'd love to hear from you.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center"
            >
              Get Started Free
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-base font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* More from Axion Deep */}
      <section className="py-12 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              More from Axion Deep
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Explore our other projects pushing the boundaries of interactive computing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {AXIONDEEP_PRODUCTS.map((product) => (
              <div
                key={product.name}
                className="p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600">
                    {product.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.status === "Research"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  }`}>
                    {product.status}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {product.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="https://axiondeep.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium hover:gap-3 transition-all"
            >
              Visit Axion Deep
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
