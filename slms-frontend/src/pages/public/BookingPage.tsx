// src/pages/public/BookingPage.tsx
// Beautiful, customizable public booking page
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "/api";

// =============================================================================
// TYPES
// =============================================================================

interface BookingConfig {
  slug: string;
  business_name: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  timezone: string;
  booking_window_days: number;
  min_notice_hours: number;
}

interface MeetingType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  color: string;
  collect_phone: boolean;
  collect_company: boolean;
  custom_questions: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  location_type: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySlots {
  date: string;
  slots: TimeSlot[];
}

interface BookingConfirmation {
  id: number;
  meeting_type_name: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_link: string | null;
  cancel_url: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function formatTimeSlot(slot: TimeSlot, timezone: string): string {
  const start = new Date(slot.start);
  return start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

// =============================================================================
// ICONS
// =============================================================================

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

function BookingPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden animate-pulse">
          {/* Header skeleton */}
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="p-8 space-y-6">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CALENDAR COMPONENT
// =============================================================================

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  availableDates: Set<string>;
  primaryColor: string;
  minDate: Date;
  maxDate: Date;
}

function Calendar({ selectedDate, onSelectDate, availableDates, primaryColor, minDate, maxDate }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      result.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(i);
    }
    return result;
  }, [daysInMonth, firstDayOfMonth]);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDateAvailable = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = date.toISOString().split("T")[0];
    return availableDates.has(dateStr) && date >= minDate && date <= maxDate;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  const contrastColor = getContrastColor(primaryColor);

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const available = isDateAvailable(day);
          const selected = isSelected(day);

          return (
            <button
              key={day}
              onClick={() => {
                if (available) {
                  onSelectDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
                }
              }}
              disabled={!available}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200",
                available && !selected && "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white",
                !available && "text-gray-300 dark:text-gray-600 cursor-not-allowed",
                selected && "text-white shadow-lg scale-105"
              )}
              style={selected ? { backgroundColor: primaryColor, color: contrastColor } : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN BOOKING PAGE COMPONENT
// =============================================================================

type BookingStep = "meeting-type" | "date-time" | "details" | "confirmation";

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const meetingParam = searchParams.get("meeting");

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [step, setStep] = useState<BookingStep>("meeting-type");
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DaySlots[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_company: "",
    guest_notes: "",
    custom_answers: {} as Record<string, string>,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load config and meeting types
  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      try {
        const [configRes, typesRes] = await Promise.all([
          fetch(`${API}/public/book/${slug}`),
          fetch(`${API}/public/book/${slug}/meeting-types`),
        ]);

        if (!configRes.ok) {
          if (configRes.status === 404) {
            setError("Booking page not found");
          } else {
            setError("Failed to load booking page");
          }
          return;
        }

        const configData = await configRes.json();
        const typesData = await typesRes.json();

        setConfig(configData);
        setMeetingTypes(typesData);

        // If meeting param provided, auto-select it
        if (meetingParam) {
          const meeting = typesData.find((t: MeetingType) => t.slug === meetingParam);
          if (meeting) {
            setSelectedMeeting(meeting);
            setStep("date-time");
          }
        }
      } catch (err) {
        setError("Failed to load booking page");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, meetingParam]);

  // Load available slots when meeting type or date changes
  useEffect(() => {
    async function loadSlots() {
      if (!slug || !selectedMeeting) return;

      setSlotsLoading(true);
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (config?.booking_window_days || 30));

        const res = await fetch(
          `${API}/public/book/${slug}/${selectedMeeting.slug}/slots?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`
        );

        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data);
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [slug, selectedMeeting, config?.booking_window_days]);

  // Get available dates from slots
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    availableSlots.forEach((day) => {
      if (day.slots.length > 0) {
        dates.add(day.date);
      }
    });
    return dates;
  }, [availableSlots]);

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    const daySlots = availableSlots.find((d) => d.date === dateStr);
    return daySlots?.slots || [];
  }, [selectedDate, availableSlots]);

  // Handlers
  const handleSelectMeeting = (meeting: MeetingType) => {
    setSelectedMeeting(meeting);
    setStep("date-time");
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "date-time") {
      setStep("meeting-type");
      setSelectedMeeting(null);
      setSelectedDate(null);
      setSelectedSlot(null);
    } else if (step === "details") {
      setStep("date-time");
      setSelectedSlot(null);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.guest_name.trim()) {
      errors.guest_name = "Name is required";
    }

    if (!formData.guest_email.trim()) {
      errors.guest_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      errors.guest_email = "Please enter a valid email";
    }

    if (selectedMeeting?.collect_phone && !formData.guest_phone.trim()) {
      errors.guest_phone = "Phone number is required";
    }

    if (selectedMeeting?.collect_company && !formData.guest_company.trim()) {
      errors.guest_company = "Company is required";
    }

    // Validate custom questions
    selectedMeeting?.custom_questions?.forEach((q) => {
      if (q.required && !formData.custom_answers[q.id]?.trim()) {
        errors[`custom_${q.id}`] = `${q.label} is required`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedSlot || !selectedMeeting || !config) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API}/public/book/${slug}/${selectedMeeting.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduled_at: selectedSlot.start,
          timezone: config.timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormErrors({ submit: data.detail || "Failed to book meeting" });
        return;
      }

      const data = await res.json();
      setConfirmation(data);
      setStep("confirmation");
    } catch (err) {
      setFormErrors({ submit: "Failed to book meeting. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return <BookingPageSkeleton />;
  }

  // Error state
  if (error || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || "Page not found"}</h1>
          <p className="text-gray-600 dark:text-gray-400">The booking page you're looking for doesn't exist or has been disabled.</p>
        </div>
      </div>
    );
  }

  const primaryColor = config.primary_color;
  const contrastColor = getContrastColor(primaryColor);

  // Calculate min/max dates
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + config.booking_window_days);

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}04 50%, transparent 100%)`,
      }}
    >
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Main card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden border border-gray-100 dark:border-gray-800">
          {/* Header */}
          <div
            className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: `${primaryColor}08` }}
          >
            <div className="flex items-center gap-4">
              {config.logo_url ? (
                <img
                  src={config.logo_url}
                  alt={config.business_name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
                  style={{ backgroundColor: primaryColor, color: contrastColor }}
                >
                  {config.business_name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{config.business_name}</h1>
                {config.welcome_message && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{config.welcome_message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step indicator */}
          {step !== "confirmation" && (
            <div className="px-6 sm:px-8 py-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                {["meeting-type", "date-time", "details"].map((s, idx) => {
                  const stepNames = ["Select Meeting", "Pick Time", "Your Details"];
                  const isActive = step === s;
                  const isPast =
                    (s === "meeting-type" && (step === "date-time" || step === "details")) ||
                    (s === "date-time" && step === "details");

                  return (
                    <div key={s} className="flex items-center gap-2 sm:gap-4">
                      {idx > 0 && <div className={cn("w-8 sm:w-12 h-0.5", isPast || isActive ? "bg-gray-400" : "bg-gray-200 dark:bg-gray-700")} />}
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all",
                            isActive && "text-white shadow-lg",
                            isPast && "bg-gray-300 dark:bg-gray-600 text-white",
                            !isActive && !isPast && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          )}
                          style={isActive ? { backgroundColor: primaryColor, color: contrastColor } : undefined}
                        >
                          {isPast ? <CheckIcon /> : idx + 1}
                        </div>
                        <span className={cn("hidden sm:block text-sm", isActive ? "font-medium text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                          {stepNames[idx]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Step 1: Select Meeting Type */}
            {step === "meeting-type" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Select a Meeting Type</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {meetingTypes.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => handleSelectMeeting(meeting)}
                      className="group relative p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 text-left hover:shadow-lg"
                    >
                      <div
                        className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                        style={{ backgroundColor: meeting.color }}
                      />
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: meeting.color }}
                        >
                          {meeting.location_type === "google_meet" || meeting.location_type === "zoom" ? (
                            <VideoIcon />
                          ) : meeting.location_type === "phone" ? (
                            <PhoneIcon />
                          ) : (
                            <LocationIcon />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                            {meeting.name}
                          </h3>
                          {meeting.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{meeting.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <ClockIcon />
                              {meeting.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1.5 capitalize">
                              {meeting.location_type === "google_meet" ? "Google Meet" : meeting.location_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === "date-time" && selectedMeeting && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeftIcon />
                  Back to meeting types
                </button>

                {/* Selected meeting info */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: selectedMeeting.color }}
                  >
                    <VideoIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{selectedMeeting.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <ClockIcon />
                        {selectedMeeting.duration_minutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <CalendarIcon />
                      Select a Date
                    </h3>
                    {slotsLoading ? (
                      <div className="h-80 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full" />
                      </div>
                    ) : (
                      <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={handleSelectDate}
                        availableDates={availableDates}
                        primaryColor={primaryColor}
                        minDate={minDate}
                        maxDate={maxDate}
                      />
                    )}
                    <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
                      <GlobeIcon />
                      {config.timezone}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <ClockIcon />
                      {selectedDate ? formatDate(selectedDate.toISOString()) : "Select a Time"}
                    </h3>
                    {selectedDate ? (
                      slotsForSelectedDate.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2">
                          {slotsForSelectedDate.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSlot(slot)}
                              className={cn(
                                "py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                                "border-2 hover:shadow-md",
                                selectedSlot?.start === slot.start
                                  ? "border-transparent text-white"
                                  : "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600"
                              )}
                              style={
                                selectedSlot?.start === slot.start
                                  ? { backgroundColor: primaryColor, color: contrastColor }
                                  : undefined
                              }
                            >
                              {formatTimeSlot(slot, config.timezone)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <CalendarIcon />
                          <p className="mt-2">No available times on this date</p>
                          <p className="text-sm">Please select another date</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <CalendarIcon />
                        <p className="mt-2">Select a date to see available times</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Enter Details */}
            {step === "details" && selectedMeeting && selectedSlot && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeftIcon />
                  Back to time selection
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Booking summary */}
                  <div className="lg:col-span-2">
                    <div className="sticky top-8">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Summary</h3>
                      <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 space-y-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: selectedMeeting.color }}
                          >
                            <VideoIcon />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{selectedMeeting.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMeeting.duration_minutes} minutes</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <CalendarIcon />
                            <span className="text-gray-900 dark:text-white">{formatDate(selectedSlot.start)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <ClockIcon />
                            <span className="text-gray-900 dark:text-white">{formatTime(selectedSlot.start, config.timezone)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <GlobeIcon />
                            <span className="text-gray-600 dark:text-gray-400">{config.timezone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="lg:col-span-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enter Your Details</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.guest_name}
                          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                            "focus:outline-none focus:ring-0",
                            formErrors.guest_name
                              ? "border-red-300 dark:border-red-700"
                              : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                          )}
                          placeholder="John Doe"
                        />
                        {formErrors.guest_name && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.guest_name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.guest_email}
                          onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                            "focus:outline-none focus:ring-0",
                            formErrors.guest_email
                              ? "border-red-300 dark:border-red-700"
                              : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                          )}
                          placeholder="john@example.com"
                        />
                        {formErrors.guest_email && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.guest_email}</p>
                        )}
                      </div>

                      {/* Phone (conditional) */}
                      {selectedMeeting.collect_phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={formData.guest_phone}
                            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                            className={cn(
                              "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                              "focus:outline-none focus:ring-0",
                              formErrors.guest_phone
                                ? "border-red-300 dark:border-red-700"
                                : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                            )}
                            placeholder="+1 (555) 123-4567"
                          />
                          {formErrors.guest_phone && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.guest_phone}</p>
                          )}
                        </div>
                      )}

                      {/* Company (conditional) */}
                      {selectedMeeting.collect_company && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Company <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.guest_company}
                            onChange={(e) => setFormData({ ...formData, guest_company: e.target.value })}
                            className={cn(
                              "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                              "focus:outline-none focus:ring-0",
                              formErrors.guest_company
                                ? "border-red-300 dark:border-red-700"
                                : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                            )}
                            placeholder="Acme Inc"
                          />
                          {formErrors.guest_company && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.guest_company}</p>
                          )}
                        </div>
                      )}

                      {/* Custom questions */}
                      {selectedMeeting.custom_questions?.map((question) => (
                        <div key={question.id}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {question.label} {question.required && <span className="text-red-500">*</span>}
                          </label>
                          {question.type === "select" && question.options ? (
                            <select
                              value={formData.custom_answers[question.id] || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_answers: { ...formData.custom_answers, [question.id]: e.target.value },
                                })
                              }
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                                "focus:outline-none focus:ring-0",
                                formErrors[`custom_${question.id}`]
                                  ? "border-red-300 dark:border-red-700"
                                  : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                              )}
                            >
                              <option value="">Select an option</option>
                              {question.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : question.type === "textarea" ? (
                            <textarea
                              value={formData.custom_answers[question.id] || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_answers: { ...formData.custom_answers, [question.id]: e.target.value },
                                })
                              }
                              rows={3}
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors resize-none",
                                "focus:outline-none focus:ring-0",
                                formErrors[`custom_${question.id}`]
                                  ? "border-red-300 dark:border-red-700"
                                  : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                              )}
                            />
                          ) : (
                            <input
                              type="text"
                              value={formData.custom_answers[question.id] || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_answers: { ...formData.custom_answers, [question.id]: e.target.value },
                                })
                              }
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 transition-colors",
                                "focus:outline-none focus:ring-0",
                                formErrors[`custom_${question.id}`]
                                  ? "border-red-300 dark:border-red-700"
                                  : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                              )}
                            />
                          )}
                          {formErrors[`custom_${question.id}`] && (
                            <p className="text-red-500 text-sm mt-1">{formErrors[`custom_${question.id}`]}</p>
                          )}
                        </div>
                      ))}

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Additional Notes
                        </label>
                        <textarea
                          value={formData.guest_notes}
                          onChange={(e) => setFormData({ ...formData, guest_notes: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none focus:ring-0 transition-colors resize-none"
                          placeholder="Anything you'd like us to know before the meeting?"
                        />
                      </div>

                      {/* Submit error */}
                      {formErrors.submit && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <p className="text-red-600 dark:text-red-400 text-sm">{formErrors.submit}</p>
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                          "w-full py-4 px-6 rounded-xl text-base font-semibold transition-all duration-200",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        )}
                        style={{ backgroundColor: primaryColor, color: contrastColor }}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Scheduling...
                          </span>
                        ) : (
                          "Schedule Meeting"
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === "confirmation" && confirmation && (
              <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-8">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor, color: contrastColor }}
                  >
                    <CheckIcon />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're Booked!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  A confirmation email has been sent to {confirmation.guest_email}
                </p>

                <div className="max-w-md mx-auto p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-left space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <VideoIcon />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{confirmation.meeting_type_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{confirmation.duration_minutes} minutes</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarIcon />
                      <span className="text-gray-900 dark:text-white">{formatDate(confirmation.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <ClockIcon />
                      <span className="text-gray-900 dark:text-white">{formatTime(confirmation.scheduled_at, confirmation.timezone)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <GlobeIcon />
                      <span className="text-gray-600 dark:text-gray-400">{confirmation.timezone}</span>
                    </div>
                  </div>

                  {confirmation.meeting_link && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <a
                        href={confirmation.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-medium transition-all hover:shadow-md"
                        style={{ backgroundColor: primaryColor, color: contrastColor }}
                      >
                        <VideoIcon />
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
                  Need to make changes?{" "}
                  <a
                    href={confirmation.cancel_url}
                    className="underline hover:no-underline"
                    style={{ color: primaryColor }}
                  >
                    Manage your booking
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Powered by */}
        <div className="text-center mt-6">
          <a
            href="https://site2crm.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span>Powered by</span>
            <span className="font-semibold">Site2CRM</span>
          </a>
        </div>
      </div>
    </div>
  );
}
