import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page Not Found");

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-white dark:bg-gray-950 px-6">
      <div className="text-center">
        {/* 404 illustration */}
        <div className="relative">
          <div className="text-[180px] md:text-[240px] font-bold text-gray-100 dark:text-gray-900 select-none leading-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <svg className="w-16 h-16 md:w-20 md:h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            Go to Homepage
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Here are some helpful links:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/features" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Features
            </Link>
            <Link to="/pricing" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Pricing
            </Link>
            <Link to="/about" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              About Us
            </Link>
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
