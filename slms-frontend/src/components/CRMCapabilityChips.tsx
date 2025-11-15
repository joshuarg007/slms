// src/components/CrmCapabilityChips.tsx
import React from "react";

type CapabilityLevel = "full" | "partial" | "limited";

export type Capability = {
  id: string;
  label: string;
  level: CapabilityLevel;
  tooltip?: string;
};

type Props = {
  items: Capability[];
  className?: string;
};

function levelClasses(level: CapabilityLevel): string {
  switch (level) {
    case "full":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
    case "partial":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800";
    case "limited":
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700";
  }
}

export default function CrmCapabilityChips({ items, className }: Props) {
  if (!items.length) return null;

  return (
    <div className={className ?? "mt-3 flex flex-wrap gap-2"}>
      {items.map((cap) => (
        <span
          key={cap.id}
          title={cap.tooltip}
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            levelClasses(cap.level),
          ].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {cap.label}
        </span>
      ))}
    </div>
  );
}