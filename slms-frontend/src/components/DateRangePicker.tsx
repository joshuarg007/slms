// src/components/DateRangePicker.tsx
import { useState, useRef, useEffect } from "react";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

type PresetKey = "7d" | "30d" | "90d" | "1y" | "custom";

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { key: PresetKey; label: string; getDates: () => { start: Date; end: Date } }[] = [
  {
    key: "7d",
    label: "Last 7 days",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  {
    key: "30d",
    label: "Last 30 days",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    },
  },
  {
    key: "90d",
    label: "Last 90 days",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { start, end };
    },
  },
  {
    key: "1y",
    label: "Last year",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    },
  },
];

export function getDateRangeFromDays(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const label = days === 7 ? "Last 7 days" : days === 30 ? "Last 30 days" : days === 90 ? "Last 90 days" : days === 365 ? "Last year" : `Last ${days} days`;
  return { startDate: start, endDate: end, label };
}

export function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(formatDateForApi(value.startDate));
  const [customEnd, setCustomEnd] = useState(formatDateForApi(value.endDate));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePreset(preset: (typeof presets)[number]) {
    const { start, end } = preset.getDates();
    onChange({ startDate: start, endDate: end, label: preset.label });
    setOpen(false);
  }

  function handleCustomApply() {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (start <= end) {
      const label = `${customStart} - ${customEnd}`;
      onChange({ startDate: start, endDate: end, label });
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{value.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
              Quick Select
            </p>
            {presets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePreset(preset)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 ${
                  value.label === preset.label
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Custom Range
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCustomApply}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
