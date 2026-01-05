// src/components/ui/Tooltip.tsx
// Accessible tooltip component for hover information

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  showOnFocus?: boolean;
}

export function Tooltip({
  children,
  content,
  position = "top",
  delay = 300,
  className = "",
  contentClassName = "",
  disabled = false,
  showOnFocus = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle positioning to keep tooltip in viewport
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let newPosition = position;

    // Check if tooltip would overflow and adjust
    if (position === "top" && trigger.top - tooltip.height < 10) {
      newPosition = "bottom";
    } else if (position === "bottom" && trigger.bottom + tooltip.height > viewport.height - 10) {
      newPosition = "top";
    } else if (position === "left" && trigger.left - tooltip.width < 10) {
      newPosition = "right";
    } else if (position === "right" && trigger.right + tooltip.width > viewport.width - 10) {
      newPosition = "left";
    }

    if (newPosition !== actualPosition) {
      setActualPosition(newPosition);
    }
  }, [isVisible, position, actualPosition]);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<TooltipPosition, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900 dark:border-t-gray-700",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900 dark:border-b-gray-700",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900 dark:border-l-gray-700",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900 dark:border-r-gray-700",
  };

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showOnFocus ? showTooltip : undefined}
      onBlur={showOnFocus ? hideTooltip : undefined}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150",
            positionClasses[actualPosition],
            contentClassName
          )}
        >
          {content}
          <div
            className={cn(
              "absolute border-4",
              arrowClasses[actualPosition]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

// InfoTooltip - for information icons with tooltips
interface InfoTooltipProps {
  content: ReactNode;
  position?: TooltipPosition;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  content,
  position = "top",
  className = "",
  iconClassName = "",
}: InfoTooltipProps) {
  return (
    <Tooltip content={content} position={position} className={className}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          iconClassName
        )}
        aria-label="More information"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="sr-only">Information</span>
      </button>
    </Tooltip>
  );
}

// StatTooltip - for stat cards with more context
interface StatTooltipProps {
  children: ReactNode;
  title: string;
  description: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  position?: TooltipPosition;
}

export function StatTooltip({
  children,
  title,
  description,
  trend,
  position = "top",
}: StatTooltipProps) {
  return (
    <Tooltip
      content={
        <div className="max-w-xs text-left space-y-1.5">
          <p className="font-medium text-white">{title}</p>
          <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
      }
      position={position}
      contentClassName="!whitespace-normal"
    >
      {children}
    </Tooltip>
  );
}

// HelpTooltip - question mark icon with helpful text
interface HelpTooltipProps {
  content: ReactNode;
  position?: TooltipPosition;
  className?: string;
}

export function HelpTooltip({
  content,
  position = "top",
  className = "",
}: HelpTooltipProps) {
  return (
    <Tooltip content={content} position={position} className={className}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="Help"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="sr-only">Help</span>
      </button>
    </Tooltip>
  );
}

export default Tooltip;
