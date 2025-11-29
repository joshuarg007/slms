import ContactForm from "@/components/marketing/ContactForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const CONTACT_OPTIONS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Email Us",
    description: "Our support team typically responds within 24 hours.",
    contact: "support@site2crm.io",
    link: "mailto:support@site2crm.io",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    title: "Live Chat",
    description: "Chat with our team in real-time during business hours.",
    contact: "Available 9am-6pm EST",
    link: "#",
  },
];

const OFFICES = [
  {
    city: "San Francisco",
    address: "100 Market Street, Suite 300",
    country: "United States",
  },
  {
    city: "London",
    address: "1 Finsbury Avenue",
    country: "United Kingdom",
  },
];

export default function ContactPage() {
  useDocumentTitle("Contact Us");

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

      {/* Contact Options */}
      <section className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {CONTACT_OPTIONS.map((option) => (
              <a
                key={option.title}
                href={option.link}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {option.icon}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                  {option.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
                <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {option.contact}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Send Us a Message
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Fill out the form and our team will get back to you within 24 hours.
              </p>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Sales Inquiries
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Interested in Site2CRM for your business? Our sales team can help you find
                    the right plan and answer any questions about features, pricing, or integrations.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Technical Support
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Having trouble with your forms or integrations? Our support team is here to
                    help you troubleshoot and get back on track.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Partnerships
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Interested in partnering with Site2CRM? We're always looking for agencies,
                    consultants, and technology partners.
                  </p>
                </div>
              </div>

              {/* Offices */}
              <div className="mt-12">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Our Offices
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {OFFICES.map((office) => (
                    <div
                      key={office.city}
                      className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {office.city}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {office.address}
                        <br />
                        {office.country}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <ContactForm
                title="Contact Us"
                subtitle="Tell us how we can help and we'll be in touch shortly."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
