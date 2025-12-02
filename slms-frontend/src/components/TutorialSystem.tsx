// src/components/TutorialSystem.tsx
// An escapable, thorough tutorial system that guides new users through the platform

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/contexts/GamificationContext";

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for the element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "input" | "view";
  wisdom?: string;
  wisdomAuthor?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Site2CRM!",
    content: "Let's take a quick tour to help you get the most out of your sales management platform. You can skip this tutorial at any time.",
    position: "center",
    wisdom: "The beginning is the most important part of the work.",
    wisdomAuthor: "Plato",
  },
  {
    id: "demo-team",
    title: "Meet Your Demo Team",
    content: "We've populated your account with 9 demo salespeople to show you how the platform works. They represent different sales archetypes and will compete with your real team on the leaderboard!",
    target: "[data-tutorial='demo-toggle']",
    position: "bottom",
    wisdom: "You are the average of the five people you spend the most time with.",
    wisdomAuthor: "Jim Rohn",
  },
  {
    id: "leaderboard",
    title: "The Leaderboard",
    content: "Track your team's performance in real-time. The leaderboard celebrates top performers AND recognizes when underdogs rise up. That's FAMILY!",
    target: "[data-tutorial='leaderboard']",
    position: "left",
    wisdom: "People don't care how much you know until they know how much you care.",
    wisdomAuthor: "Zig Ziglar",
  },
  {
    id: "view-mode",
    title: "Choose Your View",
    content: "Are you a Manager, Marketer, or Sales Rep? Choose your view to see metrics that matter most to your role.",
    target: "[data-tutorial='view-mode']",
    position: "bottom",
  },
  {
    id: "pareto",
    title: "The 80/20 Principle",
    content: "Throughout Site2CRM, we emphasize the Pareto Principle: 80% of your results come from 20% of your efforts. Focus on what matters most.",
    position: "center",
    wisdom: "Focus on being productive instead of busy.",
    wisdomAuthor: "Tim Ferriss",
  },
  {
    id: "leads",
    title: "Your Leads",
    content: "All your leads are captured here. Sort, filter, and assign them to your sales team. Quality over quantity!",
    target: "[data-tutorial='leads']",
    position: "right",
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    content: "Get a bird's-eye view of your sales operation. Key metrics, trends, and insights all in one place.",
    target: "[data-tutorial='dashboard']",
    position: "bottom",
    wisdom: "If you can't measure it, you can't improve it.",
    wisdomAuthor: "Peter Drucker",
  },
  {
    id: "complete",
    title: "You're Ready!",
    content: "That's the basics! Remember: success in sales is about consistent daily actions. Go make things happen!",
    position: "center",
    wisdom: "Success is the sum of small efforts, repeated day in and day out.",
    wisdomAuthor: "Robert Collier",
  },
];

// Tutorial Context
interface TutorialContextType {
  currentStep: TutorialStep | null;
  isActive: boolean;
  stepIndex: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  startTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}

// Tutorial Provider
export function TutorialProvider({ children }: { children: ReactNode }) {
  const { tutorialEnabled, tutorialStep, setTutorialStep, skipTutorial: skipGamificationTutorial } = useGamification();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Auto-start tutorial for new users
    if (tutorialEnabled && tutorialStep === 0) {
      setIsActive(true);
    }
  }, [tutorialEnabled, tutorialStep]);

  const currentStep = isActive && tutorialStep < TUTORIAL_STEPS.length
    ? TUTORIAL_STEPS[tutorialStep]
    : null;

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      skipGamificationTutorial();
      setIsActive(false);
    }
  };

  const prevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const skipTutorial = () => {
    skipGamificationTutorial();
    setIsActive(false);
  };

  const startTutorial = () => {
    setTutorialStep(0);
    setIsActive(true);
  };

  return (
    <TutorialContext.Provider
      value={{
        currentStep,
        isActive,
        stepIndex: tutorialStep,
        totalSteps: TUTORIAL_STEPS.length,
        nextStep,
        prevStep,
        skipTutorial,
        startTutorial,
      }}
    >
      {children}
      <TutorialOverlay />
    </TutorialContext.Provider>
  );
}

// Tutorial Overlay Component
function TutorialOverlay() {
  const { currentStep, isActive, stepIndex, totalSteps, nextStep, prevStep, skipTutorial } = useTutorial();

  if (!isActive || !currentStep) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={skipTutorial} />

        {/* Tutorial Card */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 pointer-events-auto overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-800">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    Step {stepIndex + 1} of {totalSteps}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {currentStep.title}
                  </h2>
                </div>
                <button
                  onClick={skipTutorial}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Skip tutorial (Esc)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {currentStep.content}
              </p>

              {/* Wisdom Quote */}
              {currentStep.wisdom && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 mb-4">
                  <p className="text-amber-800 dark:text-amber-200 text-sm italic">
                    "{currentStep.wisdom}"
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                    — {currentStep.wisdomAuthor}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={skipTutorial}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Skip tutorial
                </button>
                <div className="flex gap-2">
                  {stepIndex > 0 && (
                    <button
                      onClick={prevStep}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    {stepIndex === totalSteps - 1 ? "Get Started!" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Keyboard shortcut handler
export function TutorialKeyboardHandler() {
  const { skipTutorial, nextStep, prevStep, isActive } = useTutorial();

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          skipTutorial();
          break;
        case "ArrowRight":
        case "Enter":
          nextStep();
          break;
        case "ArrowLeft":
          prevStep();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, skipTutorial, nextStep, prevStep]);

  return null;
}

// Button to restart tutorial
export function RestartTutorialButton({ className = "" }: { className?: string }) {
  const { startTutorial } = useTutorial();

  return (
    <button
      onClick={startTutorial}
      className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      Restart Tutorial
    </button>
  );
}

// Mini tooltip for specific features
export function TutorialTooltip({
  children,
  tip,
  position = "top",
}: {
  children: ReactNode;
  tip: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [show, setShow] = useState(false);
  const { tutorialEnabled } = useGamification();

  if (!tutorialEnabled) return <>{children}</>;

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute ${positionClasses[position]} z-50 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none`}
          >
            {tip}
            <div
              className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 ${
                position === "top" ? "top-full -translate-y-1 left-1/2 -translate-x-1/2" :
                position === "bottom" ? "bottom-full translate-y-1 left-1/2 -translate-x-1/2" :
                position === "left" ? "left-full -translate-x-1 top-1/2 -translate-y-1/2" :
                "right-full translate-x-1 top-1/2 -translate-y-1/2"
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
