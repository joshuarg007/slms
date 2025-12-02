import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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
    title: "AI-First Thinking",
    description: "Intelligence is woven into every product we create, from lead scoring to predictive analytics.",
  },
  {
    title: "Transparent Attribution",
    description: "Unlike black-box solutions, we provide full visibility into how and why decisions are made.",
  },
];

const STATS = [
  { label: "Leads Captured", value: "2M+" },
  { label: "Happy Customers", value: "5,000+" },
  { label: "CRM Syncs Daily", value: "50K+" },
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
    description: "Visual page builder with AI-powered component generation. Drag-and-drop interface with 100+ pre-built components.",
    status: "In Development",
    link: null,
  },
  {
    name: "Quantum Gallery",
    description: "AI-orchestrated 3D scene framework for interactive visualization and procedural animations.",
    status: "Research",
    link: null,
  },
];

export default function AboutPage() {
  useDocumentTitle("About Us");

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-200 dark:border-cyan-800 mb-6">
            <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600">
              An Axion Deep Product
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            About Site2CRM
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Intelligent lead capture and enrichment, built with precision engineering and AI-first thinking.
          </p>
        </div>
      </section>

      {/* Axion Deep Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Axion Deep
              </span>
            </h2>
            <p className="text-xl text-gray-300 italic">From Thought to Precision</p>
          </div>
          <div className="prose prose-lg prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed">
              Site2CRM is developed by <strong className="text-white">Axion Deep</strong>, a research
              and engineering studio advancing the frontiers of intelligent systems, quantum-inspired
              computation, and data sciences.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Our focus is inquiry and discovery: exploring, prototyping, and validating new architectures
              that bridge scientific depth with engineering rigor. We build products that transform
              complex challenges into elegant, AI-powered solutions.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs tracking-widest text-gray-500">
            <span>AI</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>DATA SYSTEMS</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>INTEGRATION</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>SECURITY</span>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            The Site2CRM Story
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <p>
              Site2CRM transforms anonymous website traffic into actionable CRM intelligence.
              It captures visitor events, enriches company and contact data, scores intent signals,
              and syncs qualified leads directly into your CRM with full attribution.
            </p>
            <p className="mt-4">
              Unlike traditional lead capture tools that operate as black boxes, Site2CRM provides
              transparent attribution you can audit. Know exactly where leads come from, what actions
              they've taken, and why they were scored the way they were.
            </p>
            <p className="mt-4">
              We built Site2CRM because we saw the same problem over and over: getting leads from
              a website into a CRM was way harder than it needed to be. Traditional form builders
              were clunky and disconnected. Developers were stuck building custom integrations that
              broke whenever the CRM updated.
            </p>
            <p className="mt-4">
              Today, Site2CRM powers lead capture for thousands of businesses around the world,
              with AI-powered scoring, real-time CRM sync, and complete visibility into every lead's journey.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="mt-2 text-indigo-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Our Values
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
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

      {/* More from Axion Deep */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              More from Axion Deep
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Explore our other projects pushing the boundaries of AI and interactive computing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {AXIONDEEP_PRODUCTS.map((product) => (
              <div
                key={product.name}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
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

      {/* CTA */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Join Us on Our Mission
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Whether you're a customer, partner, or future team member, we'd love to hear from you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
