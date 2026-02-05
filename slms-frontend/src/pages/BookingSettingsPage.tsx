// src/pages/BookingSettingsPage.tsx
// Admin page to manage booking configuration
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "/api";

// =============================================================================
// TYPES
// =============================================================================

interface BookingConfig {
  id: number;
  slug: string;
  business_name: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  timezone: string;
  booking_window_days: number;
  min_notice_hours: number;
  buffer_minutes: number;
  is_active: boolean;
  google_calendar_connected: boolean;
}

interface CalendarStatus {
  connected: boolean;
  calendar_id: string | null;
  calendar_name: string | null;
}

interface CalendarInfo {
  id: string;
  name: string;
  primary: boolean;
}

interface MeetingType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  color: string;
  is_active: boolean;
  order_index: number;
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
  custom_location: string | null;
}

interface AvailabilityRule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Booking {
  id: number;
  meeting_type_name: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  status: string;
  created_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const LOCATION_TYPES = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "phone", label: "Phone Call" },
  { value: "in_person", label: "In Person" },
  { value: "custom", label: "Custom Location" },
];

// =============================================================================
// ICONS
// =============================================================================

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type TabType = "settings" | "meeting-types" | "availability" | "bookings" | "embed";

export default function BookingSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Data
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Modal states
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingType | null>(null);

  // Calendar integration
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
    // Check for calendar connection callback
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setSuccess("Google Calendar connected successfully!");
      loadCalendarStatus();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("calendar_error")) {
      setError(`Calendar connection failed: ${params.get("calendar_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Try to get existing config
      const configRes = await fetch(`${API}/booking/config`, {
        headers: getAuthHeaders(),
      });

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);

        // Load meeting types, availability, and bookings
        const [typesRes, availRes, bookingsRes] = await Promise.all([
          fetch(`${API}/booking/meeting-types`, { headers: getAuthHeaders() }),
          fetch(`${API}/booking/availability`, { headers: getAuthHeaders() }),
          fetch(`${API}/booking/bookings`, { headers: getAuthHeaders() }),
        ]);

        if (typesRes.ok) setMeetingTypes(await typesRes.json());
        if (availRes.ok) setAvailability(await availRes.json());
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
      }
    } catch (err) {
      setError("Failed to load booking settings");
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarStatus() {
    try {
      const res = await fetch(`${API}/booking/calendar/status`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const status = await res.json();
        setCalendarStatus(status);
        if (status.connected) {
          loadCalendars();
        }
      }
    } catch (err) {
      console.error("Failed to load calendar status:", err);
    }
  }

  async function loadCalendars() {
    try {
      const res = await fetch(`${API}/booking/calendar/list`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
      }
    } catch (err) {
      console.error("Failed to load calendars:", err);
    }
  }

  async function connectCalendar() {
    setLoadingCalendar(true);
    setError(null);
    try {
      const res = await fetch(`${API}/booking/calendar/connect`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Redirect to Google OAuth
        window.location.href = data.authorization_url;
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to connect calendar");
      }
    } catch (err) {
      setError("Failed to connect calendar");
    } finally {
      setLoadingCalendar(false);
    }
  }

  async function disconnectCalendar() {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;
    setLoadingCalendar(true);
    try {
      const res = await fetch(`${API}/booking/calendar/disconnect`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCalendarStatus({ connected: false, calendar_id: null, calendar_name: null });
        setCalendars([]);
        setSuccess("Google Calendar disconnected");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to disconnect calendar");
    } finally {
      setLoadingCalendar(false);
    }
  }

  async function selectCalendar(calendarId: string) {
    try {
      const res = await fetch(`${API}/booking/calendar/select`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ calendar_id: calendarId }),
      });
      if (res.ok) {
        const selectedCal = calendars.find(c => c.id === calendarId);
        setCalendarStatus({
          connected: true,
          calendar_id: calendarId,
          calendar_name: selectedCal?.name || calendarId,
        });
        setSuccess("Calendar selected");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to select calendar");
    }
  }

  // Load calendar status when config is loaded
  useEffect(() => {
    if (config) {
      loadCalendarStatus();
    }
  }, [config?.google_calendar_connected]);

  async function handleCreateConfig() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API}/booking/config`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          business_name: "My Business",
          timezone: "America/New_York",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create booking page");
      }

      const newConfig = await res.json();
      setConfig(newConfig);
      setSuccess("Booking page created!");

      // Initialize default availability (Mon-Fri 9-5)
      const defaultAvailability = [1, 2, 3, 4, 5].map((day) => ({
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_available: true,
      }));

      for (const rule of defaultAvailability) {
        await fetch(`${API}/booking/availability`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(rule),
        });
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking page");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API}/booking/config`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save settings");
      }

      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeetingType(data: Partial<MeetingType>) {
    setSaving(true);
    setError(null);

    try {
      const isNew = !editingMeeting;
      const url = isNew ? `${API}/booking/meeting-types` : `${API}/booking/meeting-types/${editingMeeting!.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to save meeting type");
      }

      setShowMeetingModal(false);
      setEditingMeeting(null);
      setSuccess(isNew ? "Meeting type created!" : "Meeting type updated!");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save meeting type");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMeetingType(id: number) {
    if (!confirm("Are you sure you want to delete this meeting type?")) return;

    try {
      const res = await fetch(`${API}/booking/meeting-types/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to delete meeting type");

      setSuccess("Meeting type deleted!");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete meeting type");
    }
  }

  async function handleUpdateAvailability(rule: AvailabilityRule) {
    try {
      const res = await fetch(`${API}/booking/availability/${rule.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(rule),
      });

      if (!res.ok) throw new Error("Failed to update availability");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability");
    }
  }

  async function handleCancelBooking(id: number) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`${API}/booking/bookings/${id}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to cancel booking");

      setSuccess("Booking cancelled!");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  }

  function copyBookingLink() {
    if (!config) return;
    const url = `${window.location.origin}/book/${config.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // No config yet - show setup screen
  if (!config) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <CalendarIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set Up Your Booking Page</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Create a beautiful booking page where customers can schedule meetings with you.
          </p>
          <button
            onClick={handleCreateConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Booking Page"}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  const bookingUrl = `${window.location.origin}/book/${config.slug}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your booking page and meeting types</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm">
            <LinkIcon />
            <span className="text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{bookingUrl}</span>
            <button
              onClick={copyBookingLink}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Copy link"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Preview
          </a>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
        {[
          { id: "settings", label: "Settings", icon: <CogIcon /> },
          { id: "meeting-types", label: "Meeting Types", icon: <CalendarIcon /> },
          { id: "availability", label: "Availability", icon: <ClockIcon /> },
          { id: "bookings", label: "Bookings", icon: <CalendarIcon /> },
          { id: "embed", label: "Embed", icon: <CodeIcon /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Page Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                value={config.business_name}
                onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Page URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">/book/</span>
                <input
                  type="text"
                  value={config.slug}
                  onChange={(e) => setConfig({ ...config, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Logo URL
              </label>
              <input
                type="url"
                value={config.logo_url || ""}
                onChange={(e) => setConfig({ ...config, logo_url: e.target.value || null })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primary_color}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Welcome Message
              </label>
              <textarea
                value={config.welcome_message || ""}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value || null })}
                rows={2}
                placeholder="Welcome! Select a time that works for you."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Booking Window (days ahead)
              </label>
              <input
                type="number"
                value={config.booking_window_days}
                onChange={(e) => setConfig({ ...config, booking_window_days: parseInt(e.target.value) || 30 })}
                min={1}
                max={365}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Minimum Notice (hours)
              </label>
              <input
                type="number"
                value={config.min_notice_hours}
                onChange={(e) => setConfig({ ...config, min_notice_hours: parseInt(e.target.value) || 4 })}
                min={0}
                max={168}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Buffer Between Meetings (minutes)
              </label>
              <input
                type="number"
                value={config.buffer_minutes}
                onChange={(e) => setConfig({ ...config, buffer_minutes: parseInt(e.target.value) || 15 })}
                min={0}
                max={60}
                step={5}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Google Calendar Integration */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Google Calendar</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Auto-create calendar events with Google Meet links
                </p>
              </div>
            </div>

            {calendarStatus?.connected ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Connected to Google Calendar
                    </span>
                  </div>
                  <button
                    onClick={disconnectCalendar}
                    disabled={loadingCalendar}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>

                {calendars.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Select Calendar
                    </label>
                    <select
                      value={calendarStatus.calendar_id || "primary"}
                      onChange={(e) => selectCalendar(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.name} {cal.primary && "(Primary)"}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Bookings will be added to this calendar
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Connect your Google Calendar to automatically create events when someone books a meeting.
                  Events will include Google Meet links for video meetings.
                </p>
                <button
                  onClick={connectCalendar}
                  disabled={loadingCalendar}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {loadingCalendar ? "Connecting..." : "Connect Google Calendar"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page is active and accepting bookings
              </span>
            </label>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Meeting Types Tab */}
      {activeTab === "meeting-types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Types</h2>
            <button
              onClick={() => {
                setEditingMeeting(null);
                setShowMeetingModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon />
              Add Meeting Type
            </button>
          </div>

          {meetingTypes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <CalendarIcon />
              <p className="text-gray-600 dark:text-gray-400 mt-2">No meeting types yet</p>
              <p className="text-sm text-gray-500">Create your first meeting type to start accepting bookings</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {meetingTypes.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: meeting.color }}
                    >
                      <CalendarIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{meeting.name}</h3>
                          {meeting.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meeting.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingMeeting(meeting);
                              setShowMeetingModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMeetingType(meeting.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <ClockIcon />
                          {meeting.duration_minutes} min
                        </span>
                        <span className="capitalize">{meeting.location_type.replace("_", " ")}</span>
                        {!meeting.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === "availability" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Availability</h2>
          <div className="space-y-3">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const rule = availability.find((r) => r.day_of_week === dayIndex);
              return (
                <div
                  key={dayIndex}
                  className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <label className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      checked={rule?.is_available ?? false}
                      onChange={(e) => {
                        if (rule) {
                          handleUpdateAvailability({ ...rule, is_available: e.target.checked });
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dayName}</span>
                  </label>
                  {rule?.is_available && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={rule.start_time}
                        onChange={(e) => handleUpdateAvailability({ ...rule, start_time: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={rule.end_time}
                        onChange={(e) => handleUpdateAvailability({ ...rule, end_time: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                  )}
                  {!rule?.is_available && (
                    <span className="text-sm text-gray-400">Unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Bookings</h2>
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <CalendarIcon />
              <p className="text-gray-600 dark:text-gray-400 mt-2">No bookings yet</p>
              <p className="text-sm text-gray-500">Bookings will appear here once someone schedules a meeting</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{booking.guest_name}</div>
                        <div className="text-sm text-gray-500">{booking.guest_email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {booking.meeting_type_name}
                        <span className="text-gray-400 ml-1">({booking.duration_minutes} min)</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDateTime(booking.scheduled_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                            booking.status === "confirmed" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                            booking.status === "cancelled" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          )}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-sm text-red-500 hover:text-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Embed Tab */}
      {activeTab === "embed" && (
        <EmbedTab config={config} />
      )}

      {/* Meeting Type Modal */}
      {showMeetingModal && (
        <MeetingTypeModal
          meeting={editingMeeting}
          onSave={handleSaveMeetingType}
          onClose={() => {
            setShowMeetingModal(false);
            setEditingMeeting(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

// =============================================================================
// MEETING TYPE MODAL
// =============================================================================

interface MeetingTypeModalProps {
  meeting: MeetingType | null;
  onSave: (data: Partial<MeetingType>) => void;
  onClose: () => void;
  saving: boolean;
}

function MeetingTypeModal({ meeting, onSave, onClose, saving }: MeetingTypeModalProps) {
  const [form, setForm] = useState({
    name: meeting?.name || "",
    slug: meeting?.slug || "",
    description: meeting?.description || "",
    duration_minutes: meeting?.duration_minutes || 30,
    color: meeting?.color || "#6366f1",
    is_active: meeting?.is_active ?? true,
    collect_phone: meeting?.collect_phone ?? false,
    collect_company: meeting?.collect_company ?? true,
    location_type: meeting?.location_type || "google_meet",
    custom_location: meeting?.custom_location || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {meeting ? "Edit Meeting Type" : "New Meeting Type"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="30-Minute Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="A quick call to discuss your needs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Duration</label>
              <select
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
            <select
              value={form.location_type}
              onChange={(e) => setForm({ ...form, location_type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {LOCATION_TYPES.map((loc) => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>
          </div>

          {form.location_type === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Custom Location</label>
              <input
                type="text"
                value={form.custom_location}
                onChange={(e) => setForm({ ...form, custom_location: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="123 Main St or https://meet.example.com"
              />
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.collect_phone}
                onChange={(e) => setForm({ ...form, collect_phone: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require phone number</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.collect_company}
                onChange={(e) => setForm({ ...form, collect_company: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require company name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible on booking page)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// EMBED TAB
// =============================================================================

interface EmbedTabProps {
  config: BookingConfig;
}

function EmbedTab({ config }: EmbedTabProps) {
  const [embedType, setEmbedType] = useState<"floating" | "inline">("floating");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [buttonText, setButtonText] = useState("Book a Meeting");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "https://api.site2crm.io";
  const bookingUrl = `${window.location.origin}/book/${config.slug}`;

  const embedCode = embedType === "floating"
    ? `<script src="${apiBase}/api/public/booking-widget.js"
        data-slug="${config.slug}"
        data-button-text="${buttonText}"
        data-button-color="${config.primary_color}"
        data-position="${position}">
</script>`
    : `<script src="${apiBase}/api/public/booking-widget.js"
        data-slug="${config.slug}"
        data-button-text="${buttonText}"
        data-button-color="${config.primary_color}"
        data-inline="true">
</script>`;

  function copyEmbedCode() {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  function copyDirectLink() {
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Direct Link Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Direct Link</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Share this link directly with your clients or add it to your email signature.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            readOnly
            value={bookingUrl}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-mono"
          />
          <button
            onClick={copyDirectLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {copiedLink ? <CheckIcon /> : <CopyIcon />}
            {copiedLink ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Embed Widget Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Embed Widget</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Add a booking button to your website. Visitors can schedule meetings without leaving your site.
        </p>

        {/* Widget Type Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setEmbedType("floating")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              embedType === "floating"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Floating Button</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fixed button in a corner of the screen. Always visible.
            </p>
          </button>

          <button
            onClick={() => setEmbedType("inline")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              embedType === "inline"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Inline Button</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Button placed in your page content. Good for contact pages.
            </p>
          </button>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {embedType === "floating" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as typeof position)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview
          </label>
          <div className="relative h-32 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              Your website content
            </div>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold shadow-lg",
                embedType === "floating" ? "absolute" : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                embedType === "floating" && position === "bottom-right" && "bottom-4 right-4",
                embedType === "floating" && position === "bottom-left" && "bottom-4 left-4",
                embedType === "floating" && position === "top-right" && "top-4 right-4",
                embedType === "floating" && position === "top-left" && "top-4 left-4"
              )}
              style={{ backgroundColor: config.primary_color }}
            >
              <CalendarIcon />
              {buttonText}
            </button>
          </div>
        </div>

        {/* Embed Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Embed Code
          </label>
          <div className="relative">
            <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-sm font-mono overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <button
              onClick={copyEmbedCode}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
            >
              {copiedEmbed ? <CheckIcon /> : <CopyIcon />}
              {copiedEmbed ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Paste this code just before the closing <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">&lt;/body&gt;</code> tag on your website.
          </p>
        </div>
      </div>

      {/* Integration Tips */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3">Integration Tips</h3>
        <ul className="space-y-2 text-sm text-indigo-700 dark:text-indigo-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>The widget automatically opens in a modal, so visitors stay on your site.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>For inline placement, add <code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800">data-container="your-div-id"</code> to place the button in a specific element.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>Use <code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800">Site2CRMBooking.open()</code> and <code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800">Site2CRMBooking.close()</code> for programmatic control.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
