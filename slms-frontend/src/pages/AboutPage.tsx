export default function AboutPage() {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-3">About Site2CRM</h1>
        <p className="text-gray-700">
          Site2CRM helps teams capture leads, analyze performance, and surface
          actionable insights. HubSpot is supported today; Pipedrive, Nutshell,
          and Salesforce are on the roadmap. The app includes a lightweight
          widget for lead capture, a public endpoint for form posts, and
          salesperson stats aggregated from your CRM.
        </p>
        <p className="text-gray-700 mt-3">
          Future releases will add advanced lead scoring, coaching insights, and weekly
          reports—configurable in Settings.
        </p>
      </div>
    );
  }
  