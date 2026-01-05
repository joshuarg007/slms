import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

export default function TermsPage() {
  useSEO({
    title: "Terms of Service",
    description:
      "Site2CRM Terms of Service. Read our terms and conditions for using the Site2CRM lead capture and CRM integration platform.",
    path: "/terms",
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
            Terms of Service
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              By accessing or using Site2CRM ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Site2CRM provides a lead capture and CRM integration platform that allows users to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Create and embed customizable lead capture forms on websites</li>
              <li>Automatically sync captured leads to supported CRM systems</li>
              <li>Track and manage leads through a dashboard interface</li>
              <li>Receive notifications for new lead submissions</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Account Registration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              To use the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Collect data without proper consent from data subjects</li>
              <li>Send spam or unsolicited communications</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to any systems</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Data and Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your use of the Service is also governed by our{" "}
              <Link to="/privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </Link>
              . You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>You are responsible for obtaining consent to collect lead data</li>
              <li>You will handle all data in compliance with applicable privacy laws</li>
              <li>We may process data as necessary to provide the Service</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Payment and Billing
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              For paid subscription plans:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days notice</li>
              <li>Failure to pay may result in service suspension</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The Service and all associated intellectual property rights belong to Site2CRM.
              You retain ownership of your data and content uploaded to the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              To the maximum extent permitted by law, Site2CRM shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages resulting from
              your use of the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Termination
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Either party may terminate this agreement at any time. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Your access to the Service will be revoked</li>
              <li>You may request export of your data within 30 days</li>
              <li>We may delete your data after 30 days</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We may update these terms from time to time. We will notify you of material changes
              via email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Contact
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@site2crm.io" className="text-indigo-600 hover:underline">
                legal@site2crm.io
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
