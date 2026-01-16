// src/pages/public/DevelopersPage.tsx
// Public API documentation page

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

// Code block component with copy functionality
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// Section component
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Endpoint component
function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  const methodColors = {
    GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2 py-1 text-xs font-bold rounded ${methodColors[method]}`}>
            {method}
          </span>
          <code className="text-sm font-mono text-gray-900 dark:text-white">{path}</code>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50">{children}</div>
    </div>
  );
}

// Parameter table
function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 font-semibold text-gray-900 dark:text-white">Parameter</th>
            <th className="pb-2 font-semibold text-gray-900 dark:text-white">Type</th>
            <th className="pb-2 font-semibold text-gray-900 dark:text-white">Required</th>
            <th className="pb-2 font-semibold text-gray-900 dark:text-white">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <tr key={param.name} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 font-mono text-indigo-600 dark:text-indigo-400">{param.name}</td>
              <td className="py-2 text-gray-600 dark:text-gray-400">{param.type}</td>
              <td className="py-2">
                {param.required ? (
                  <span className="text-red-600 dark:text-red-400">Yes</span>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </td>
              <td className="py-2 text-gray-600 dark:text-gray-400">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DevelopersPage() {
  useSEO({
    title: "API Documentation - Site2CRM",
    description: "Integrate Site2CRM with your applications using our REST API. Create leads, sync data, and automate your workflow.",
    path: "/developers",
  });

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "authentication", label: "Authentication" },
    { id: "rate-limits", label: "Rate Limits" },
    { id: "endpoints", label: "Endpoints" },
    { id: "errors", label: "Error Handling" },
    { id: "examples", label: "Examples" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Developer Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Site2CRM API</h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Integrate lead capture directly into your applications. Push leads to Site2CRM from anywhere.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#endpoints"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              View Endpoints
            </a>
            <Link
              to="/signup"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
            >
              Get API Key
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <nav className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                On this page
              </p>
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Overview */}
            <Section id="overview" title="Overview">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The Site2CRM API allows you to programmatically create leads in your account. Use it to integrate
                lead capture from custom forms, landing pages, mobile apps, or third-party services.
              </p>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  <strong>Base URL:</strong>{" "}
                  <code className="bg-indigo-100 dark:bg-indigo-800 px-2 py-0.5 rounded">
                    https://api.site2crm.io
                  </code>
                </p>
              </div>
            </Section>

            {/* Authentication */}
            <Section id="authentication" title="Authentication">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                All API requests require authentication using your Organization API Key. Include it in the
                <code className="mx-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">X-Org-Key</code>
                header with every request.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Finding Your API Key
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-6">
                <li>Log in to your Site2CRM dashboard</li>
                <li>Navigate to <strong>Settings</strong> in the sidebar</li>
                <li>Scroll to the <strong>API Access</strong> section</li>
                <li>Copy your API key</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Example Request
              </h3>
              <CodeBlock
                language="bash"
                code={`curl -X POST https://api.site2crm.io/api/public/leads \\
  -H "Content-Type: application/json" \\
  -H "X-Org-Key: your_api_key_here" \\
  -d '{"email": "lead@example.com", "name": "John Doe"}'`}
              />

              <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Security Warning:</strong> Never expose your API key in client-side code. Always make API
                  calls from your server to protect your key.
                </p>
              </div>
            </Section>

            {/* Rate Limits */}
            <Section id="rate-limits" title="Rate Limits">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                API requests are rate limited to ensure fair usage and protect the service from abuse.
              </p>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Endpoint</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Limit</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">POST /api/public/leads</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">60 requests</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">1 minute</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">All other endpoints</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">100 requests</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">1 minute</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Rate Limit Headers
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                When rate limited, the API returns a <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">429 Too Many Requests</code> response with:
              </p>
              <CodeBlock
                language="json"
                code={`{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retry_after": 45
}`}
              />
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                The <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Retry-After</code> header is also set with the number of seconds to wait.
              </p>
            </Section>

            {/* Endpoints */}
            <Section id="endpoints" title="Endpoints">
              <Endpoint
                method="POST"
                path="/api/public/leads"
                description="Create a new lead in your organization"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Headers</h4>
                <ParamTable
                  params={[
                    { name: "X-Org-Key", type: "string", required: true, description: "Your organization API key" },
                    { name: "Content-Type", type: "string", required: true, description: "Must be application/json" },
                  ]}
                />

                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">Body Parameters</h4>
                <ParamTable
                  params={[
                    { name: "email", type: "string", required: true, description: "Lead's email address" },
                    { name: "name", type: "string", required: false, description: "Full name (or use first_name + last_name)" },
                    { name: "first_name", type: "string", required: false, description: "First name" },
                    { name: "last_name", type: "string", required: false, description: "Last name" },
                    { name: "phone", type: "string", required: false, description: "Phone number" },
                    { name: "company", type: "string", required: false, description: "Company name" },
                    { name: "source", type: "string", required: false, description: "Lead source (e.g., 'API', 'Landing Page')" },
                    { name: "notes", type: "string", required: false, description: "Additional notes" },
                    { name: "utm_source", type: "string", required: false, description: "UTM source parameter" },
                    { name: "utm_medium", type: "string", required: false, description: "UTM medium parameter" },
                    { name: "utm_campaign", type: "string", required: false, description: "UTM campaign parameter" },
                  ]}
                />

                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">Success Response (201)</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "lead_id": 12345,
  "message": "Lead created successfully",
  "synced_to_crm": true
}`}
                />

                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">Custom Fields</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Any additional fields not listed above will be captured as custom fields and appended to the lead's notes.
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "email": "lead@example.com",
  "name": "John Doe",
  "budget": "$10,000",
  "timeline": "Q2 2026",
  "product_interest": "Enterprise Plan"
}`}
                />
              </Endpoint>
            </Section>

            {/* Error Handling */}
            <Section id="errors" title="Error Handling">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The API uses standard HTTP status codes to indicate success or failure.
              </p>

              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                      2xx
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Success</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Request completed successfully.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                      400
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Bad Request</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Invalid request body or missing required fields.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                      401
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Unauthorized</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Missing or invalid API key.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                      429
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Too Many Requests</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rate limit exceeded. Check the Retry-After header.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                      500
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Server Error</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Something went wrong on our end. Please try again or contact support.</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Error Response Format</h3>
              <CodeBlock
                language="json"
                code={`{
  "detail": {
    "error": "validation_error",
    "message": "Email is required",
    "field": "email"
  }
}`}
              />
            </Section>

            {/* Examples */}
            <Section id="examples" title="Code Examples">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">cURL</h3>
              <CodeBlock
                language="bash"
                code={`curl -X POST https://api.site2crm.io/api/public/leads \\
  -H "Content-Type: application/json" \\
  -H "X-Org-Key: your_api_key_here" \\
  -d '{
    "email": "jane@acme.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "company": "Acme Corp",
    "phone": "(555) 123-4567",
    "source": "API",
    "utm_source": "google",
    "utm_campaign": "spring_sale"
  }'`}
              />

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">JavaScript (fetch)</h3>
              <CodeBlock
                language="javascript"
                code={`const response = await fetch('https://api.site2crm.io/api/public/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Org-Key': 'your_api_key_here',
  },
  body: JSON.stringify({
    email: 'jane@acme.com',
    first_name: 'Jane',
    last_name: 'Smith',
    company: 'Acme Corp',
    source: 'Website Form',
  }),
});

const data = await response.json();
console.log(data);`}
              />

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">Python (requests)</h3>
              <CodeBlock
                language="python"
                code={`import requests

response = requests.post(
    'https://api.site2crm.io/api/public/leads',
    headers={
        'Content-Type': 'application/json',
        'X-Org-Key': 'your_api_key_here',
    },
    json={
        'email': 'jane@acme.com',
        'first_name': 'Jane',
        'last_name': 'Smith',
        'company': 'Acme Corp',
        'source': 'Python Script',
    }
)

print(response.json())`}
              />

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">PHP</h3>
              <CodeBlock
                language="php"
                code={`<?php
$ch = curl_init('https://api.site2crm.io/api/public/leads');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Org-Key: your_api_key_here',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'email' => 'jane@acme.com',
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'company' => 'Acme Corp',
        'source' => 'PHP Form',
    ]),
]);

$response = curl_exec($ch);
curl_close($ch);

print_r(json_decode($response, true));`}
              />
            </Section>

            {/* CTA */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mt-12">
              <h2 className="text-2xl font-bold mb-2">Ready to integrate?</h2>
              <p className="text-indigo-100 mb-6">
                Sign up for Site2CRM to get your API key and start capturing leads programmatically.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/contact"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 font-semibold rounded-lg transition-colors"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
