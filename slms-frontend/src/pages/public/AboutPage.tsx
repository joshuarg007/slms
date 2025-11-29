import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const TEAM = [
  {
    name: "Sarah Chen",
    role: "CEO & Co-Founder",
    bio: "Former VP of Product at a leading marketing automation company. 15+ years in B2B SaaS.",
  },
  {
    name: "Marcus Rodriguez",
    role: "CTO & Co-Founder",
    bio: "Previously engineering lead at Salesforce. Built integrations used by millions.",
  },
  {
    name: "Emily Watson",
    role: "Head of Customer Success",
    bio: "Passionate about helping businesses grow. 10+ years in customer success.",
  },
  {
    name: "David Kim",
    role: "Head of Engineering",
    bio: "Full-stack expert with a focus on scalable, secure systems.",
  },
];

const VALUES = [
  {
    title: "Customer First",
    description: "Every decision we make starts with the question: how does this help our customers succeed?",
  },
  {
    title: "Simplicity",
    description: "Powerful doesn't have to mean complicated. We obsess over making things simple and intuitive.",
  },
  {
    title: "Reliability",
    description: "Your leads are your business. We take uptime, security, and data integrity seriously.",
  },
  {
    title: "Transparency",
    description: "No hidden fees, no surprise charges, no black boxes. We're upfront about everything.",
  },
];

const STATS = [
  { label: "Leads Captured", value: "2M+" },
  { label: "Happy Customers", value: "5,000+" },
  { label: "CRM Syncs Daily", value: "50K+" },
  { label: "Countries", value: "45+" },
];

export default function AboutPage() {
  useDocumentTitle("About Us");

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            About Site2CRM
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We're on a mission to help businesses capture more leads and close more deals.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Our Story
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <p>
              Site2CRM was born out of frustration. As marketers and sales leaders ourselves,
              we saw the same problem over and over: getting leads from a website into a CRM
              was way harder than it needed to be.
            </p>
            <p className="mt-4">
              Traditional form builders were clunky and disconnected. Developers were stuck
              building custom integrations that broke whenever the CRM updated. And leads
              were falling through the cracks because of manual data entry.
            </p>
            <p className="mt-4">
              We knew there had to be a better way. So in 2023, we set out to build the
              simplest, most reliable way to capture website leads and sync them to your CRM
              automatically. No code, no hassle, no lost leads.
            </p>
            <p className="mt-4">
              Today, Site2CRM powers lead capture for thousands of businesses around the world.
              And we're just getting started.
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

      {/* Team */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Meet the Team
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM.map((member) => (
              <div key={member.name} className="text-center">
                {/* Avatar placeholder */}
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  {member.role}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {member.bio}
                </p>
              </div>
            ))}
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
