import React from "react";

export default function WidgetTestPage() {
  return (
    <div className="min-h-[70vh] rounded-2xl p-4 sm:p-6 bg-gray-100 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-semibold">Lead Capture Widget (Test)</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This is an embedded preview of the public lead form.
          </p>
        </header>

        {/* card wrapper for the iframe */}
        <div className="rounded-2xl shadow border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <iframe
            title="lead-widget"
            src="/test_widget.html"
            className="w-full"
            style={{ height: 640, border: "0" }}
          />
        </div>
      </div>
    </div>
  );
}
