// src/components/UnderdogCelebration.tsx
// Celebrates when an underdog rises in the rankings - FAMILY lifts each other up!

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnderdogMoment {
  userId: number;
  userName: string;
  previousRank: number;
  newRank: number;
  beatenUsers: string[];
  timestamp: Date;
}

interface UnderdogCelebrationProps {
  moment: UnderdogMoment;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const UNDERDOG_MESSAGES = [
  "The comeback is always stronger than the setback! 💪",
  "From the bottom, the only way is up! 🚀",
  "They counted you out. You proved them wrong! 🏆",
  "Rocky Balboa would be proud! 🥊",
  "The underdog rises! FAMILY celebrates together! 👊",
  "Hard work pays off. The grind never lies! 💎",
  "Today you proved: consistency beats talent when talent doesn't work hard! ⭐",
  "Champions are made when no one is watching. Today we see! 👀",
];

const FAMILY_ENCOURAGEMENTS = [
  "Your team is behind you! 🤝",
  "We all win when one of us rises! 🎉",
  "This is what FAMILY is about! ❤️",
  "Your success inspires the whole team! ✨",
  "Together we climb higher! 🏔️",
];

export default function UnderdogCelebration({
  moment,
  onClose,
  autoClose = true,
  autoCloseDelay = 8000,
}: UnderdogCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  // Generate confetti
  useEffect(() => {
    const colors = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6"];
    const newConfetti = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(newConfetti);
  }, []);

  // Auto close
  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500);
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoClose, autoCloseDelay, onClose]);

  const message = UNDERDOG_MESSAGES[Math.floor(Math.random() * UNDERDOG_MESSAGES.length)];
  const familyMessage = FAMILY_ENCOURAGEMENTS[Math.floor(Math.random() * FAMILY_ENCOURAGEMENTS.length)];
  const rankImprovement = moment.previousRank - moment.newRank;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confetti.map((c) => (
              <motion.div
                key={c.id}
                initial={{ y: -20, opacity: 1 }}
                animate={{
                  y: "100vh",
                  opacity: 0,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: c.delay,
                  ease: "linear",
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${c.x}%`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>

          {/* Celebration Card */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-1 shadow-2xl max-w-md w-full"
          >
            <div className="bg-white dark:bg-gray-900 rounded-[22px] p-6 text-center relative overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse" />
              </div>

              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30"
              >
                <span className="text-5xl">🏆</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
              >
                UNDERDOG RISING!
              </motion.h2>

              {/* User & Improvement */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
                  {moment.userName}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-gray-400 text-lg">#{moment.previousRank}</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-2xl"
                  >
                    →
                  </motion.span>
                  <span className="text-emerald-500 text-2xl font-bold">#{moment.newRank}</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="font-semibold">+{rankImprovement} spots</span>
                </motion.div>
              </motion.div>

              {/* Beaten users */}
              {moment.beatenUsers.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm text-gray-500 dark:text-gray-400 mb-4"
                >
                  Passed: {moment.beatenUsers.slice(0, 3).join(", ")}
                  {moment.beatenUsers.length > 3 && ` +${moment.beatenUsers.length - 3} more`}
                </motion.p>
              )}

              {/* Motivational message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl mb-4"
              >
                <p className="text-amber-800 dark:text-amber-200 font-medium">{message}</p>
              </motion.div>

              {/* FAMILY message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-sm text-rose-500 dark:text-rose-400 font-medium"
              >
                {familyMessage}
              </motion.p>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={handleClose}
                className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
              >
                Keep Climbing! 🚀
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Mini toast for leaderboard changes
export function RankChangeToast({
  change,
  show,
  onClose,
}: {
  change: { direction: "up" | "down"; spots: number; userName: string };
  show: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div
            className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              change.direction === "up"
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            <span className="text-xl">{change.direction === "up" ? "📈" : "📉"}</span>
            <div>
              <p className="font-medium">{change.userName}</p>
              <p className="text-sm opacity-90">
                {change.direction === "up" ? "Moved up" : "Moved down"} {change.spots} spot
                {change.spots !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Improvement badge shown on profile
export function ImprovementBadge({ improvement }: { improvement: number }) {
  if (improvement <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        improvement >= 5
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          : improvement >= 3
          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      }`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      {improvement}
      {improvement >= 5 && <span className="ml-0.5">🔥</span>}
    </motion.div>
  );
}
