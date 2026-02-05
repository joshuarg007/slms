// src/pages/public/BookingManagePage.tsx
// Public page for guests to view, reschedule, or cancel their booking
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "/api";

// =============================================================================
// TYPES
// =============================================================================

interface BookingDetails {
  id: number;
  meeting_type_name: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  status: string;
  meeting_link: string | null;
  cancel_url: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BookingManagePage() {
  const { slug, bookingId } = useParams<{ slug: string; bookingId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId || !token) {
        setError("Invalid booking link");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/public/book/booking/${bookingId}?token=${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Booking not found");
          } else {
            setError("Failed to load booking");
          }
          return;
        }

        const data = await res.json();
        setBooking(data);
      } catch (err) {
        setError("Failed to load booking");
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId, token]);

  async function handleCancel() {
    if (!bookingId || !token) return;
    setCancelling(true);

    try {
      const res = await fetch(`${API}/public/book/booking/${bookingId}/cancel?token=${token}&reason=${encodeURIComponent(cancelReason)}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to cancel booking");
        return;
      }

      setCancelled(true);
      setShowCancelConfirm(false);
    } catch (err) {
      setError("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full" />
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || "Booking not found"}</h1>
          <p className="text-gray-600 dark:text-gray-400">The booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  // Cancelled success state
  if (cancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Cancelled</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your booking has been cancelled. The host has been notified.
          </p>
          <a
            href={`/book/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Book Again
          </a>
        </div>
      </div>
    );
  }

  const isPast = new Date(booking.scheduled_at) < new Date();
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className={cn(
            "p-6 text-center",
            isCancelled ? "bg-red-50 dark:bg-red-900/20" : isPast ? "bg-gray-50 dark:bg-gray-800/50" : "bg-green-50 dark:bg-green-900/20"
          )}>
            <div className={cn(
              "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
              isCancelled ? "bg-red-100 dark:bg-red-900/30 text-red-600" : isPast ? "bg-gray-200 dark:bg-gray-700 text-gray-600" : "bg-green-100 dark:bg-green-900/30 text-green-600"
            )}>
              {isCancelled ? <XIcon /> : <CheckIcon />}
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isCancelled ? "Booking Cancelled" : isPast ? "Past Booking" : "Booking Confirmed"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isCancelled ? "This booking was cancelled" : isPast ? "This meeting has already occurred" : `Confirmation sent to ${booking.guest_email}`}
            </p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                <VideoIcon />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{booking.meeting_type_name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{booking.duration_minutes} minutes</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon />
                <span className="text-gray-900 dark:text-white">{formatDate(booking.scheduled_at)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ClockIcon />
                <span className="text-gray-900 dark:text-white">{formatTime(booking.scheduled_at, booking.timezone)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <GlobeIcon />
                <span className="text-gray-600 dark:text-gray-400">{booking.timezone}</span>
              </div>
            </div>

            {/* Meeting link */}
            {booking.meeting_link && !isCancelled && !isPast && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <a
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  <VideoIcon />
                  Join Meeting
                </a>
              </div>
            )}

            {/* Actions */}
            {!isCancelled && !isPast && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Cancel Booking
                </button>
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

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancel Booking?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to cancel this booking? The host will be notified.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Let us know why you're cancelling..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
