// src/components/WisdomTooltip.tsx
// Displays sales wisdom quotes throughout the app

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SalesWisdom, SALES_WISDOM_TOOLTIPS, getWisdomForContext } from "@/data/demoSalespeople";

interface WisdomTooltipProps {
  context?: string;
  wisdom?: SalesWisdom;
  variant?: "floating" | "inline" | "banner" | "minimal";
  autoRotate?: boolean;
  rotateInterval?: number;
  onDismiss?: () => void;
  className?: string;
}

export default function WisdomTooltip({
  context = "general",
  wisdom: providedWisdom,
  variant = "inline",
  autoRotate = false,
  rotateInterval = 30000,
  onDismiss,
  className = "",
}: WisdomTooltipProps) {
  const [wisdom, setWisdom] = useState<SalesWisdom | null>(providedWisdom || null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!providedWisdom) {
      setWisdom(getWisdomForContext(context));
    }
  }, [context, providedWisdom]);

  useEffect(() => {
    if (!autoRotate || providedWisdom) return;

    const interval = setInterval(() => {
      const contexts = Object.keys(SALES_WISDOM_TOOLTIPS);
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
      setWisdom(getWisdomForContext(randomContext));
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval, providedWisdom]);

  if (!wisdom || !visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (variant === "minimal") {
    return (
      <div className={`text-center py-2 ${className}`}>
        <p className="text-sm italic text-gray-500 dark:text-gray-400">
          "{wisdom.quote}"
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          — {wisdom.author}
        </p>
      </div>
    );
  }

  if (variant === "floating") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`fixed bottom-6 right-6 max-w-sm z-40 ${className}`}
        >
          <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-2xl shadow-indigo-500/30">
            {/* Decorative quote mark */}
            <div className="absolute -top-2 -left-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-amber-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <p className="text-base font-medium leading-relaxed pr-6">
              "{wisdom.quote}"
            </p>
            <p className="text-indigo-200 text-sm mt-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-indigo-300 rounded-full" />
              {wisdom.author}
            </p>

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              "{wisdom.quote}"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              — {wisdom.author}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default: inline
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-indigo-500 dark:text-indigo-400">💡</span>
      <span className="text-gray-600 dark:text-gray-400 italic">"{wisdom.quote}"</span>
      <span className="text-gray-400 dark:text-gray-500">— {wisdom.author}</span>
    </div>
  );
}

// Smaller wisdom badge that appears on hover
export function WisdomBadge({ wisdom, className = "" }: { wisdom: SalesWisdom; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-xs ${className}`}>
      <span className="text-amber-600 dark:text-amber-400">💡</span>
      <span className="text-amber-800 dark:text-amber-200 font-medium truncate max-w-[200px]">
        {wisdom.quote.length > 50 ? wisdom.quote.slice(0, 50) + "..." : wisdom.quote}
      </span>
    </div>
  );
}

// Auto-rotating wisdom in header/footer areas
export function RotatingWisdom({ className = "" }: { className?: string }) {
  const [wisdom, setWisdom] = useState<SalesWisdom | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const contexts = Object.keys(SALES_WISDOM_TOOLTIPS);
    const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
    setWisdom(getWisdomForContext(randomContext));

    const interval = setInterval(() => {
      const ctx = contexts[Math.floor(Math.random() * contexts.length)];
      setWisdom(getWisdomForContext(ctx));
      setKey(k => k + 1);
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  if (!wisdom) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className={`text-center ${className}`}
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          "{wisdom.quote}" — <span className="font-medium">{wisdom.author}</span>
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
