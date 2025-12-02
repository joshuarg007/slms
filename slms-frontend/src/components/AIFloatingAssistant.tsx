// src/components/AIFloatingAssistant.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const AI_TIPS = [
  "I've identified 3 leads with buying signals that need immediate attention.",
  "Your email response rate is 12% above industry average. Keep it up!",
  "Based on historical patterns, Thursday afternoons show highest conversion rates.",
  "Lead velocity is trending up 8% week-over-week. Strong momentum.",
  "I've detected a potential high-value lead from enterprise segment.",
  "Your pipeline has $42K at risk due to stalled negotiations.",
  "Top performer insight: Morning calls convert 23% better than afternoon.",
  "Recommendation: 4 leads should be reassigned based on rep capacity.",
  "Alert: 2 competitors mentioned in recent lead conversations.",
  "Opportunity: LinkedIn source showing 2.3x higher LTV than average.",
];

export default function AIFloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [hasNotification, setHasNotification] = useState(true);
  const [tipFading, setTipFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % AI_TIPS.length);
        setHasNotification(true);
        setTipFading(false);
      }, 300);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Panel */}
      <div
        className={`absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Assistant</p>
              <p className="text-white/70 text-xs">Always analyzing</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/70 text-xs">Live</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p
                className={`text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-300 ${
                  tipFading ? "opacity-0" : "opacity-100"
                }`}
              >
                {AI_TIPS[currentTip]}
              </p>
              <p className="text-xs text-gray-400 mt-1">Just now</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/app/chat"
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Ask AI
              </Link>
              <Link
                to="/app/recommendations"
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                View All
              </Link>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Model confidence</span>
              <span className="font-medium text-green-600">94.2%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: isOpen ? "94.2%" : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNotification(false);
        }}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-gray-800 dark:bg-gray-700 rotate-0"
            : "bg-gradient-to-br from-indigo-600 to-purple-600 hover:shadow-indigo-500/25 hover:shadow-xl"
        }`}
      >
        <div
          className={`transition-all duration-300 ${
            isOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0 absolute"
          }`}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div
          className={`transition-all duration-300 ${
            isOpen ? "-rotate-90 opacity-0 absolute" : "rotate-0 opacity-100"
          }`}
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        {/* Notification dot */}
        <span
          className={`absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center transition-all duration-300 ${
            hasNotification && !isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        >
          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
        </span>

        {/* Glow effect */}
        <span
          className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" style={{ animationDuration: "2s" }} />
        </span>
      </button>
    </div>
  );
}
