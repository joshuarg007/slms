import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSEO, schemas } from "@/hooks/useSEO";
import { KB_CATEGORIES, getArticlesByCategory } from "@/data/knowledgeBase";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  icon: string;
  items: FAQItem[];
};

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    title: "Getting Started",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    items: [
      {
        question: "How do I create my first form?",
        answer:
          "After signing up, go to Dashboard > Forms > Create Form. Choose a template or start from scratch, customize your fields, and copy the embed code to add it to your website.",
      },
      {
        question: "How long does setup take?",
        answer:
          "Most users are capturing leads within 10 minutes. Just create a form, embed it on your site, and connect your CRM.",
      },
      {
        question: "Do I need technical skills to use Site2CRM?",
        answer:
          "No. Our drag-and-drop form builder and one-click CRM integrations require zero coding. For advanced users, we also offer API access.",
      },
      {
        question: "Can I try Site2CRM before committing?",
        answer:
          "Yes! All plans come with a 14-day free trial. No credit card required to get started.",
      },
    ],
  },
  {
    title: "Features & Usage",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    items: [
      {
        question: "How does lead scoring work?",
        answer:
          "Our system analyzes lead data including source, behavior, and engagement patterns to assign a score from 0-100. Higher scores indicate leads more likely to convert, helping your sales team prioritize outreach.",
      },
      {
        question: "Can I customize form fields?",
        answer:
          "Yes. Add any fields you need: text, email, phone, dropdown, checkbox, date picker, and more. Professional plans also support conditional logic.",
      },
      {
        question: "How do notifications work?",
        answer:
          "Get instant email notifications when leads submit forms. Professional plans add SMS alerts and Slack integration for real-time team updates.",
      },
      {
        question: "What analytics are available?",
        answer:
          "Track form views, submissions, conversion rates, lead sources, and salesperson performance. View trends over time and export reports.",
      },
    ],
  },
  {
    title: "Integrations",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    items: [
      {
        question: "What CRMs do you integrate with?",
        answer:
          "We integrate with HubSpot, Salesforce, Pipedrive, and Zoho. More integrations are added regularly based on customer feedback.",
      },
      {
        question: "How do I connect my CRM?",
        answer:
          "Go to Settings > Integrations, select your CRM, and follow the OAuth flow. Most integrations take under 2 minutes to set up.",
      },
      {
        question: "Can I use multiple CRMs?",
        answer:
          "Yes. Professional and Enterprise plans support connecting multiple CRMs simultaneously, with rules to route leads to the right destination.",
      },
      {
        question: "Do you support webhooks?",
        answer:
          "Yes. Send lead data to any endpoint in real-time. Perfect for custom integrations, Zapier workflows, or internal systems.",
      },
    ],
  },
  {
    title: "Billing & Account",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    items: [
      {
        question: "Can I upgrade or downgrade my plan?",
        answer:
          "Absolutely. You can change your plan at any time from Settings > Billing. Changes take effect on your next billing cycle.",
      },
      {
        question: "What happens if I exceed my lead limit?",
        answer:
          "We'll notify you when you're approaching your limit. You can upgrade anytime, or we'll queue leads until your next billing period.",
      },
      {
        question: "Do you offer discounts for annual billing?",
        answer:
          "Yes! Pay annually and get 2 months free on any plan. That's a 17% discount.",
      },
      {
        question: "How do I cancel my subscription?",
        answer:
          "Go to Settings > Billing > Cancel Subscription. Your access continues until the end of your billing period. We'd love feedback on how we can improve.",
      },
    ],
  },
  {
    title: "Security & Privacy",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    items: [
      {
        question: "Is my data secure?",
        answer:
          "Yes. We use industry-standard AES-256 encryption at rest and TLS 1.3 in transit. All data is stored in SOC 2 Type II certified data centers.",
      },
      {
        question: "Are you GDPR compliant?",
        answer:
          "Yes. We provide tools for consent management, data export, and right-to-be-forgotten requests. See our Privacy Policy for details.",
      },
      {
        question: "Where is my data stored?",
        answer:
          "Data is stored in AWS data centers in the US. Enterprise plans can request specific regions for compliance requirements.",
      },
      {
        question: "Do you sell my data?",
        answer:
          "Never. Your data is yours. We don't sell, share, or monetize customer data in any way.",
      },
      {
        question: "How do I export my data?",
        answer:
          "Go to Settings > Account and click 'Export My Data'. You'll receive a JSON file containing all your personal data, leads, form configurations, and integration settings (excluding sensitive credentials).",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Settings > Account and click 'Delete Account'. You'll need to confirm by typing your email. This permanently deletes your account, all leads, and organization data (if you're the sole member). This action cannot be undone.",
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex justify-between items-center text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-white pr-4">
          {item.question}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600 dark:text-gray-400">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState(0);

  // Generate FAQ schema from all categories
  const faqJsonLd = useMemo(() => {
    const allFaqs = FAQ_CATEGORIES.flatMap((cat) => cat.items);
    return schemas.faqPage(allFaqs);
  }, []);

  useSEO({
    title: "Help Center - FAQs & Support",
    description:
      "Get answers to common questions about Site2CRM. Learn about getting started, features, CRM integrations, billing, and security. Contact support if you need help.",
    path: "/help",
    jsonLd: faqJsonLd,
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Help Center
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Find answers to common questions about Site2CRM
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="py-8 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {FAQ_CATEGORIES.map((category, index) => (
              <button
                key={category.title}
                onClick={() => setActiveCategory(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeCategory === index
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={FAQ_CATEGORIES[activeCategory].icon}
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {FAQ_CATEGORIES[activeCategory].title}
            </h2>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
            {FAQ_CATEGORIES[activeCategory].items.map((item) => (
              <FAQAccordion key={item.question} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge Base */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Knowledge Base
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Step-by-step guides and tutorials
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {KB_CATEGORIES.map((category) => {
              const articles = getArticlesByCategory(category.slug);
              return (
                <div key={category.slug} id={category.slug} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <svg
                        className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={category.icon}
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          to={`/help/${category.slug}/${article.slug}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Still have questions?
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Our team is here to help
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="mailto:labs@axiondeep.com"
              className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
