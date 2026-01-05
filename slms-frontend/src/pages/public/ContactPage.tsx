import ContactForm from "@/components/marketing/ContactForm";
import { useSEO } from "@/hooks/useSEO";

export default function ContactPage() {
  useSEO({
    title: "Contact Us - Get in Touch",
    description:
      "Have questions about Site2CRM? Want a demo? Contact our team. We respond within 24 hours. Email: labs@axiondeep.com",
    path: "/contact",
  });

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Have a question about Site2CRM? Want to see a demo? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-6">
          <ContactForm
            title="Send Us a Message"
            subtitle="Fill out the form and our team will get back to you within 24 hours."
          />
        </div>
      </section>

      {/* Email Option - Centered */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center">
            <a
              href="mailto:support@site2crm.io"
              className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all group text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                Email Us Directly
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Our support team typically responds within 24 hours.
              </p>
              <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                support@site2crm.io
              </p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
