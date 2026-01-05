import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

export default function PrivacyPage() {
  useSEO({
    title: "Privacy Policy",
    description:
      "Site2CRM Privacy Policy. Learn how we collect, use, and protect your data. GDPR compliant. We never sell your information.",
    path: "/privacy",
  });

  return (
    <div className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-12">
          <Link
            to="/"
            className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-2 mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Site2CRM ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-3">
              2.1 Account Information
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Organization name</li>
              <li>Billing information (processed by our payment provider)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-3">
              2.2 Lead Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              When leads submit forms created through our Service, we collect the data they provide,
              which may include names, email addresses, phone numbers, and custom field responses.
            </p>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-3">
              2.3 Usage Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We automatically collect certain information about your use of the Service, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>IP address and browser type</li>
              <li>Pages visited and features used</li>
              <li>Form submission statistics</li>
              <li>Device and operating system information</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative notifications and updates</li>
              <li>Respond to customer service requests</li>
              <li>Improve and personalize the Service</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>CRM Integrations:</strong> Lead data is synced to your connected CRM platforms as directed by you</li>
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, payment processing, email)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Regular security assessments and monitoring</li>
              <li>Access controls and authentication requirements</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We retain your data for as long as your account is active or as needed to provide the Service.
              After account termination, we retain data for up to 30 days before permanent deletion,
              unless longer retention is required by law.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Your Rights
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@site2crm.io" className="text-indigo-600 hover:underline">
                privacy@site2crm.io
              </a>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Cookies and Tracking
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences</li>
              <li>Analyze usage and improve the Service</li>
              <li>Provide relevant marketing (with consent where required)</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place to protect your data in accordance with
              this Privacy Policy and applicable law.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Children's Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The Service is not intended for use by children under 16. We do not knowingly collect
              personal information from children under 16. If you believe we have collected such
              information, please contact us immediately.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <p className="text-gray-900 dark:text-white font-medium">Site2CRM</p>
              <p className="text-gray-600 dark:text-gray-400">
                Email:{" "}
                <a href="mailto:privacy@site2crm.io" className="text-indigo-600 hover:underline">
                  privacy@site2crm.io
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
