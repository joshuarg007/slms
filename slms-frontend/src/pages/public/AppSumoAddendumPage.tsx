import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

export default function AppSumoAddendumPage() {
  useSEO({
    title: "AppSumo Lifetime License Addendum",
    description:
      "AppSumo Lifetime License Addendum for Site2CRM. Terms and conditions for lifetime license holders.",
    path: "/legal/appsumo-addendum",
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
            AppSumo Lifetime License Addendum
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Version 1.0 | Effective Date: January 2026
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {/* Preamble */}
          <section className="mb-10 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This AppSumo Lifetime License Addendum ("Addendum") forms part of the Site2CRM Terms of Service ("Terms")
              between Axion Deep Labs Inc. ("Company," "we," "us") and the customer who redeems a Site2CRM lifetime
              license through the AppSumo marketplace ("Customer," "you").
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This Addendum applies only to customers who have purchased and redeemed a Site2CRM lifetime license via AppSumo.
              All other users are governed solely by the Terms.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Except as expressly modified by this Addendum, the Terms remain in full force and effect.
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Lifetime License Grant
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Subject to Customer's continued compliance with the Terms and this Addendum, Company grants Customer a
              non-transferable, non-assignable, perpetual license to access and use the Site2CRM service under the
              AppSumo Plan described in Section 2.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">This license is:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>One-time purchase with no recurring fees</li>
              <li>Non-refundable after the AppSumo refund window closes</li>
              <li>Limited to a single organization account</li>
              <li>Not transferable or assignable to any other person, entity, or organization</li>
            </ul>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200 italic">
              "Perpetual" means for as long as the Site2CRM service remains commercially available.
              Company is under no obligation to operate the service indefinitely.
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. AppSumo Plan Limits
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Customer's lifetime license is strictly limited to the following features and usage caps ("AppSumo Plan"):
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-gray-900 dark:text-white">Feature</th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-gray-900 dark:text-white">Limit</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Leads per calendar month</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">1,500 (hard cap)</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Active form configurations</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">2</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">CRM integrations</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">2</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">AI features</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-red-600 dark:text-red-400">Not included</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Branding removal</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-red-600 dark:text-red-400">Not included</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Priority support</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-red-600 dark:text-red-400">Not included</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The AppSumo Plan does not include any features, services, or capacity not expressly listed above.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Company reserves the right to add features or increase limits to the AppSumo Plan at its sole discretion.
              Company will not intentionally reduce the stated limits of the AppSumo Plan except where required for
              legal, security, or operational reasons.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Quota Enforcement
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Usage limits under the AppSumo Plan are enforced as hard caps.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Once a monthly lead quota is reached:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Additional form submissions are rejected at the point of submission</li>
              <li>No additional data is accepted, processed, or stored</li>
              <li>Service resumes automatically at 00:00 UTC on the first day of the next calendar month</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400">
              Customer acknowledges that Company has no obligation to accept, queue, store, or recover submissions
              that exceed plan limits. Rejected submissions are not retrievable.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. No Upgrade Path
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The AppSumo Plan has no upgrade path.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              To access paid subscription plans or higher-tier features, Customer must:
            </p>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Cancel and permanently forfeit the lifetime license; and</li>
              <li>Subscribe to a paid plan under the then-current pricing and Terms</li>
            </ol>
            <p className="text-gray-600 dark:text-gray-400">
              No credit, refund, proration, or value transfer applies to any forfeited lifetime license.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Support
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Support for AppSumo Plan customers is provided on a reasonable-efforts basis via email only.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">AppSumo Plan customers do not receive:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Priority response times</li>
              <li>Dedicated support channels</li>
              <li>Phone or live chat support</li>
              <li>Onboarding assistance</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Service Modifications
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Company may modify, update, or discontinue features of the Site2CRM service at any time.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">If Company discontinues the Site2CRM service entirely:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Company will provide at least 30 days' notice to the email address on file</li>
              <li>Customer may export their data during the notice period</li>
              <li>No refund or compensation is owed for discontinued service</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Priority of Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              In the event of a conflict between this Addendum and the Terms:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>This Addendum controls only with respect to pricing, plan limits, and lifetime license scope</li>
              <li>The Terms control in all other respects, including but not limited to: liability, indemnification,
                  data protection, privacy, acceptable use, intellectual property, termination for cause, and governing law</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Termination
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Company retains the right to suspend or terminate access to the service in accordance with the Terms, including for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>Violations of acceptable use policies</li>
              <li>Fraudulent or abusive conduct</li>
              <li>Attempts to circumvent usage limits</li>
              <li>Unlawful activity</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Termination for cause results in immediate and permanent loss of access to the AppSumo Plan without refund.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Upon termination, Customer's data will be handled in accordance with the data retention provisions of the Terms.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Entire Agreement
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This Addendum, together with the Terms and Privacy Policy, constitutes the entire agreement governing
              Customer's use of Site2CRM under the AppSumo lifetime license.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              This Addendum supersedes any representations made on the AppSumo marketplace listing to the extent of any conflict.
              Customer acknowledges that marketing descriptions on the AppSumo marketplace are non-binding and for informational purposes only.
            </p>
          </section>

          {/* Footer */}
          <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-900 dark:text-white font-semibold">Axion Deep Labs Inc.</p>
            <p className="text-gray-600 dark:text-gray-400">labs@axiondeep.com</p>
            <p className="text-gray-600 dark:text-gray-400">https://site2crm.io</p>
          </section>
        </div>
      </div>
    </div>
  );
}
