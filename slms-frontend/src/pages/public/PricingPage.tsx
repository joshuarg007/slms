import { Link } from "react-router-dom";
import { useSEO, schemas } from "@/hooks/useSEO";

const PLANS = [
  {
    name: "Site2CRM",
    price: "$29",
    period: "/month",
    description: "Everything you need to stop manual CRM entry.",
    features: [
      "1 embedded form",
      "Up to 100 leads/month",
      "Email notifications",
      "Basic analytics",
      "1 CRM integration",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Site2CRM PRO",
    price: "$79",
    period: "/month",
    description: "For teams that need unlimited power and flexibility.",
    features: [
      "Unlimited forms",
      "Up to 1,000 leads/month",
      "Email & SMS notifications",
      "Advanced analytics",
      "All CRM integrations",
      "Custom fields",
      "Priority support",
      "Remove branding",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Site2CRM Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with advanced security and compliance needs.",
    features: [
      "Everything in PRO",
      "Unlimited leads",
      "SSO / SAML",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise option",
      "API access",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const FAQS = [
  {
    question: "Can I try Site2CRM before committing?",
    answer:
      "Yes! All plans come with a 14-day free trial. No credit card required to get started.",
  },
  {
    question: "What CRMs do you integrate with?",
    answer:
      "We integrate with HubSpot, Salesforce, Pipedrive, and Nutshell. More integrations are added regularly.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "Absolutely. You can change your plan at any time. Changes take effect on your next billing cycle.",
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
    question: "Is my data secure?",
    answer:
      "Absolutely. We use industry-standard encryption, are SOC 2 compliant, and never sell your data.",
  },
];

export default function PricingPage() {
  useSEO({
    title: "Pricing - Plans Starting at $29/month",
    description:
      "Simple, transparent pricing for Site2CRM. Starter plan at $29/mo, Professional at $79/mo. 14-day free trial, no credit card required. Cancel anytime.",
    path: "/pricing",
    jsonLd: schemas.product({ pricing: { starter: "29", pro: "79" } }),
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start capturing leads in minutes. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/25 scale-105"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                <h3
                  className={`text-xl font-semibold ${
                    plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {plan.name}
                </h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={plan.highlighted ? "text-indigo-100" : "text-gray-500 dark:text-gray-400"}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-3 text-sm ${
                    plan.highlighted ? "text-indigo-100" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          plan.highlighted ? "text-indigo-200" : "text-green-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className={`text-sm ${
                          plan.highlighted ? "text-white" : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.name === "Site2CRM Enterprise" ? "/contact" : "/signup"}
                  className={`mt-8 block w-full py-3 text-center font-semibold rounded-xl transition-all ${
                    plan.highlighted
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Frequently Asked Questions
          </h2>

          <div className="grid gap-6">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {faq.question}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Still have questions?
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Our team is here to help you find the right plan for your business.
          </p>
          <Link
            to="/contact"
            className="inline-block mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            Contact Sales
          </Link>
        </div>
      </section>
    </div>
  );
}
