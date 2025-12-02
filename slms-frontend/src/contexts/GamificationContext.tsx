// src/contexts/GamificationContext.tsx
// Manages demo salespeople, wisdom tooltips, and gamification features

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  DEMO_SALESPEOPLE,
  DemoSalesperson,
  SalesWisdom,
  generateDemoPerformance,
  getWisdomForContext,
  SALES_WISDOM_TOOLTIPS,
} from "@/data/demoSalespeople";
import { SalespersonKPI } from "@/utils/api";

interface UnderdogMoment {
  userId: number;
  userName: string;
  previousRank: number;
  newRank: number;
  beatenUsers: string[];
  timestamp: Date;
}

interface GamificationState {
  // Demo team visibility
  showDemoTeam: boolean;
  setShowDemoTeam: (show: boolean) => void;
  canMuteDemoTeam: boolean; // True when 3+ real salespeople exist

  // Demo data
  demoSalespeople: DemoSalesperson[];
  getDemoPerformance: () => SalespersonKPI[];

  // Wisdom system
  currentWisdom: SalesWisdom | null;
  refreshWisdom: (context?: string) => void;
  getWisdomForSalesperson: (personId: number) => SalesWisdom[];

  // Underdog system
  underdogMoments: UnderdogMoment[];
  celebrateUnderdog: (moment: UnderdogMoment) => void;
  clearUnderdogMoment: (userId: number) => void;

  // Tutorial system
  tutorialEnabled: boolean;
  setTutorialEnabled: (enabled: boolean) => void;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  skipTutorial: () => void;

  // View mode
  viewMode: "manager" | "marketer" | "rep";
  setViewMode: (mode: "manager" | "marketer" | "rep") => void;
}

const GamificationContext = createContext<GamificationState | undefined>(undefined);

const STORAGE_KEYS = {
  showDemoTeam: "site2crm.showDemoTeam",
  tutorialEnabled: "site2crm.tutorialEnabled",
  tutorialStep: "site2crm.tutorialStep",
  viewMode: "site2crm.viewMode",
};

export function GamificationProvider({ children }: { children: ReactNode }) {
  // Demo team
  const [showDemoTeam, setShowDemoTeamState] = useState(true);
  const [realSalespeopleCount, setRealSalespeopleCount] = useState(0);

  // Wisdom
  const [currentWisdom, setCurrentWisdom] = useState<SalesWisdom | null>(null);

  // Underdog
  const [underdogMoments, setUnderdogMoments] = useState<UnderdogMoment[]>([]);

  // Tutorial
  const [tutorialEnabled, setTutorialEnabledState] = useState(true);
  const [tutorialStep, setTutorialStepState] = useState(0);

  // View mode
  const [viewMode, setViewModeState] = useState<"manager" | "marketer" | "rep">("manager");

  // Load from localStorage
  useEffect(() => {
    try {
      const storedShowDemo = localStorage.getItem(STORAGE_KEYS.showDemoTeam);
      if (storedShowDemo !== null) {
        setShowDemoTeamState(storedShowDemo === "true");
      }

      const storedTutorial = localStorage.getItem(STORAGE_KEYS.tutorialEnabled);
      if (storedTutorial !== null) {
        setTutorialEnabledState(storedTutorial === "true");
      }

      const storedStep = localStorage.getItem(STORAGE_KEYS.tutorialStep);
      if (storedStep !== null) {
        setTutorialStepState(parseInt(storedStep, 10));
      }

      const storedViewMode = localStorage.getItem(STORAGE_KEYS.viewMode);
      if (storedViewMode) {
        setViewModeState(storedViewMode as "manager" | "marketer" | "rep");
      }
    } catch {
      // Ignore localStorage errors
    }

    // Set initial wisdom
    const randomContext = Object.keys(SALES_WISDOM_TOOLTIPS)[
      Math.floor(Math.random() * Object.keys(SALES_WISDOM_TOOLTIPS).length)
    ];
    setCurrentWisdom(getWisdomForContext(randomContext));
  }, []);

  // Persist state changes
  const setShowDemoTeam = useCallback((show: boolean) => {
    setShowDemoTeamState(show);
    try {
      localStorage.setItem(STORAGE_KEYS.showDemoTeam, String(show));
    } catch { /* ignore */ }
  }, []);

  const setTutorialEnabled = useCallback((enabled: boolean) => {
    setTutorialEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.tutorialEnabled, String(enabled));
    } catch { /* ignore */ }
  }, []);

  const setTutorialStep = useCallback((step: number) => {
    setTutorialStepState(step);
    try {
      localStorage.setItem(STORAGE_KEYS.tutorialStep, String(step));
    } catch { /* ignore */ }
  }, []);

  const setViewMode = useCallback((mode: "manager" | "marketer" | "rep") => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.viewMode, mode);
    } catch { /* ignore */ }
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialEnabled(false);
    setTutorialStep(999);
  }, [setTutorialEnabled, setTutorialStep]);

  // Generate demo performance data
  const getDemoPerformance = useCallback((): SalespersonKPI[] => {
    if (!showDemoTeam) return [];

    // Use current month as seed for consistent data within the month
    const seed = new Date().getMonth() * 1000 + new Date().getFullYear();

    return DEMO_SALESPEOPLE.map((person, idx) => {
      const perf = generateDemoPerformance(person, seed + idx);
      return {
        ...perf,
        total_activities: perf.calls_count + perf.emails_count + perf.meetings_count,
      };
    });
  }, [showDemoTeam]);

  // Wisdom refresh
  const refreshWisdom = useCallback((context?: string) => {
    if (context) {
      setCurrentWisdom(getWisdomForContext(context));
    } else {
      const contexts = Object.keys(SALES_WISDOM_TOOLTIPS);
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
      setCurrentWisdom(getWisdomForContext(randomContext));
    }
  }, []);

  const getWisdomForSalesperson = useCallback((personId: number): SalesWisdom[] => {
    const person = DEMO_SALESPEOPLE.find(p => p.id === personId);
    return person?.wisdom || [];
  }, []);

  // Underdog celebration
  const celebrateUnderdog = useCallback((moment: UnderdogMoment) => {
    setUnderdogMoments(prev => [...prev, moment]);
  }, []);

  const clearUnderdogMoment = useCallback((userId: number) => {
    setUnderdogMoments(prev => prev.filter(m => m.userId !== userId));
  }, []);

  // Can mute demo team when 3+ real salespeople exist
  const canMuteDemoTeam = realSalespeopleCount >= 3;

  const value: GamificationState = {
    showDemoTeam,
    setShowDemoTeam,
    canMuteDemoTeam,
    demoSalespeople: DEMO_SALESPEOPLE,
    getDemoPerformance,
    currentWisdom,
    refreshWisdom,
    getWisdomForSalesperson,
    underdogMoments,
    celebrateUnderdog,
    clearUnderdogMoment,
    tutorialEnabled,
    setTutorialEnabled,
    tutorialStep,
    setTutorialStep,
    skipTutorial,
    viewMode,
    setViewMode,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}

// Hook to update real salespeople count (call from API responses)
export function useUpdateRealSalespeopleCount() {
  // This would be called when fetching team data
  // For now, returns a placeholder
  return () => {};
}
