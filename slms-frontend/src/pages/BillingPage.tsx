// src/pages/BillingPage.tsx
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getApiBase } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Payment provider type
type PaymentProvider = "stripe" | "paypal";

// Initialize Stripe - reads from env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface SubscriptionData {
  plan: string;
  billing_cycle: string;
  subscription_status: string;
  plan_source: string;  // stripe, paypal, appsumo, manual
  current_period_end: string | null;
  trial_ends_at: string | null;
  is_trial_active: boolean;
  trial_days_remaining: number;
  usage: {
    leads_this_month: number;
    leads_limit: number;
    leads_remaining: number;
  };
  limits: {
    leads_per_month: number;
    forms: number;
    crm_integrations: number;
    remove_branding: boolean;
    priority_support: boolean;
  };
}

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
}

const PLANS = [
  {
    id: "starter",
    name: "Site2CRM",
    monthlyPrice: 29,
    annualPrice: 290,
    features: [
      "1 embedded form",
      "100 leads/month",
      "Email notifications",
      "1 CRM integration",
    ],
  },
  {
    id: "pro",
    name: "Site2CRM PRO",
    monthlyPrice: 79,
    annualPrice: 790,
    popular: true,
    features: [
      "Unlimited forms",
      "1,000 leads/month",
      "All CRM integrations",
      "Remove branding",
      "Priority support",
    ],
  },
];

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#374151",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

// Payment Method Form Component
function UpdatePaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Get setup intent from backend
      const setupRes = await fetch(`${getApiBase()}/billing/setup-intent`, {
        method: "POST",
        credentials: "include",
      });
      const setupData = await setupRes.json();
      if (!setupRes.ok) throw new Error(setupData?.detail || "Failed to create setup intent");

      // Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError } = await stripe.confirmCardSetup(setupData.client_secret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) throw new Error(stripeError.message);

      // Update default payment method in backend
      const updateRes = await fetch(`${getApiBase()}/billing/payment-method`, {
        method: "POST",
        credentials: "include",
      });
      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData?.detail || "Failed to set payment method");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
        <CardElement options={cardElementOptions} />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Main Billing Page
export default function BillingPage() {
  useDocumentTitle("Billing");
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkoutRedirecting, setCheckoutRedirecting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("stripe");

  // Prevent duplicate checkout - check if already in progress on mount
  useEffect(() => {
    const checkoutStarted = sessionStorage.getItem("checkout_in_progress");
    if (checkoutStarted) {
      const startTime = parseInt(checkoutStarted, 10);
      // If checkout started within last 5 minutes, show redirecting state
      if (Date.now() - startTime < 5 * 60 * 1000) {
        setCheckoutRedirecting(true);
      } else {
        // Stale checkout flag, clear it
        sessionStorage.removeItem("checkout_in_progress");
      }
    }
  }, []);

  // Check for success/cancel from Stripe or PayPal redirect
  useEffect(() => {
    const status = searchParams.get("status");
    const provider = searchParams.get("provider");
    const subscriptionId = searchParams.get("subscription_id");

    if (status === "success") {
      // If PayPal, need to capture the subscription
      if (provider === "paypal" && subscriptionId) {
        capturePayPalSubscription(subscriptionId);
      } else {
        setSuccess("Subscription activated successfully!");
      }
      // Clear checkout flag on success
      sessionStorage.removeItem("checkout_in_progress");
      setCheckoutRedirecting(false);
    } else if (status === "cancel") {
      // Clear checkout flag on cancel
      sessionStorage.removeItem("checkout_in_progress");
      setCheckoutRedirecting(false);
    }
  }, [searchParams]);

  // Capture PayPal subscription after user returns from approval
  async function capturePayPalSubscription(subscriptionId: string) {
    setBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/paypal/capture`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to activate PayPal subscription");
      setSuccess("PayPal subscription activated successfully!");
      fetchSubscription();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error activating PayPal subscription");
    } finally {
      setBusy(false);
    }
  }

  // Fetch all billing data
  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    await Promise.all([
      fetchSubscription(),
      fetchPaymentMethod(),
      fetchInvoices(),
    ]);
    setLoading(false);
  }

  async function fetchSubscription() {
    try {
      const res = await fetch(`${getApiBase()}/billing/subscription`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        setBillingCycle(data.billing_cycle || "monthly");
      }
    } catch {
      // Ignore
    }
  }

  async function fetchPaymentMethod() {
    try {
      const res = await fetch(`${getApiBase()}/billing/payment-method`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentMethod(data.payment_method);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchInvoices() {
    try {
      const res = await fetch(`${getApiBase()}/billing/invoices`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch {
      // Ignore
    }
  }

  async function startTrial() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/billing/start-trial`, {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || "Unable to start trial");
      setSuccess("Trial started! Enjoy all features for 14 days.");
      fetchSubscription();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error starting trial");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(plan: string) {
    // Prevent duplicate clicks
    if (busy || checkoutRedirecting) {
      return;
    }

    // Check if already has active subscription for this plan
    if (subscription?.subscription_status === "active" && subscription?.plan === plan) {
      setErr("You already have an active subscription for this plan.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      if (paymentProvider === "paypal") {
        // PayPal checkout
        const res = await fetch(`${getApiBase()}/paypal/create-subscription`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billing_cycle: billingCycle }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.detail || "Unable to start PayPal checkout");

        // Set persistent flag BEFORE redirect
        sessionStorage.setItem("checkout_in_progress", Date.now().toString());
        setCheckoutRedirecting(true);

        // Navigate to PayPal approval URL
        window.location.href = j.approval_url;
      } else {
        // Stripe checkout
        const res = await fetch(`${getApiBase()}/billing/checkout`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billing_cycle: billingCycle }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.detail || "Unable to start checkout");

        // Set persistent flag BEFORE redirect to prevent duplicate checkouts
        sessionStorage.setItem("checkout_in_progress", Date.now().toString());
        setCheckoutRedirecting(true);

        // Navigate to Stripe
        window.location.href = j.url;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Checkout error");
      setBusy(false);
      setCheckoutRedirecting(false);
      sessionStorage.removeItem("checkout_in_progress");
    }
  }

  async function cancelSubscription() {
    if (!confirm("Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.")) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // Use PayPal cancel endpoint if subscription is via PayPal
      const endpoint = subscription?.plan_source === "paypal"
        ? `${getApiBase()}/paypal/cancel`
        : `${getApiBase()}/billing/cancel`;

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || "Unable to cancel subscription");
      setSuccess("Subscription will be canceled at the end of your billing period.");
      fetchSubscription();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Cancel error");
    } finally {
      setBusy(false);
    }
  }

  function handlePaymentSuccess() {
    setShowUpdateCard(false);
    setSuccess("Payment method updated successfully!");
    fetchPaymentMethod();
  }

  const isActive = subscription?.subscription_status === "active" || subscription?.subscription_status === "canceling";
  const isTrial = subscription?.is_trial_active;
  const isPaid = isActive && !isTrial;
  const isAppSumo = subscription?.plan === "appsumo";
  const isPayPal = subscription?.plan_source === "paypal";

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString();
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      open: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      void: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      uncollectible: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return styles[status] || styles.draft;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your subscription, payment method, and invoices
          </p>
        </header>

        {/* Checkout in progress banner */}
        {checkoutRedirecting && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
            <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Redirecting to secure checkout... Please wait.
          </div>
        )}

        {/* Alerts */}
        {err && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {err}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Trial Banner */}
        {isTrial && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-100 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Trial Active
                </div>
                <h3 className="mt-1 text-xl font-bold">
                  {subscription?.trial_days_remaining} days remaining
                </h3>
                <p className="mt-1 text-amber-100">
                  Upgrade now to keep all your features
                </p>
              </div>
              <button
                onClick={() => checkout("pro")}
                disabled={busy || checkoutRedirecting}
                className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutRedirecting ? "Redirecting..." : "Upgrade Now"}
              </button>
            </div>
          </div>
        )}

        {/* Current Plan & Usage */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {subscription?.plan || "Free"}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isAppSumo ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                subscription?.subscription_status === "canceling" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                isPaid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                isTrial ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {isAppSumo ? "Lifetime" : subscription?.subscription_status === "canceling" ? "Canceling" : isPaid ? "Active" : isTrial ? "Trial" : "Free"}
              </div>
            </div>
            {isAppSumo && (
              <p className="mt-4 text-sm text-purple-600 dark:text-purple-400">
                Lifetime access via AppSumo — no recurring fees
              </p>
            )}
            {isPaid && !isAppSumo && subscription?.current_period_end && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {subscription?.subscription_status === "canceling" ? "Ends" : "Renews"} {new Date(subscription.current_period_end).toLocaleDateString()}
                <span className="ml-2 text-gray-400">({subscription.billing_cycle})</span>
              </p>
            )}
          </div>

          {/* Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Leads This Month</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {subscription?.usage.leads_this_month || 0}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                / {subscription?.usage.leads_limit === -1 ? "Unlimited" : subscription?.usage.leads_limit || 10}
              </span>
            </div>
            {subscription?.usage.leads_limit !== -1 && (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (subscription?.usage.leads_this_month || 0) >= (subscription?.usage.leads_limit || 10)
                        ? "bg-red-500"
                        : "bg-indigo-500"
                    }`}
                    style={{
                      width: `${Math.min(100, ((subscription?.usage.leads_this_month || 0) / (subscription?.usage.leads_limit || 10)) * 100)}%`
                    }}
                  />
                </div>
                {(subscription?.usage.leads_remaining || 0) <= 10 && subscription?.usage.leads_remaining !== -1 && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    {subscription?.usage.leads_remaining} leads remaining this month
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Method - not shown for AppSumo lifetime plans or PayPal subscriptions */}
        {isPaid && !isAppSumo && !isPayPal && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h3>

            {showUpdateCard ? (
              <div className="mt-4 max-w-md">
                <UpdatePaymentForm
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setShowUpdateCard(false)}
                />
              </div>
            ) : paymentMethod ? (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {paymentMethod.brand}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      **** **** **** {paymentMethod.last4}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdateCard(true)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Update
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No payment method on file</p>
                <button
                  onClick={() => setShowUpdateCard(true)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Add payment method
                </button>
              </div>
            )}
          </div>
        )}

        {/* PayPal subscription info */}
        {isPaid && isPayPal && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h3>
            <div className="mt-4 flex items-center gap-4">
              <div className="w-12 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                <svg className="w-6 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">PayPal</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Managed via your PayPal account
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection - hidden for AppSumo users */}
        {isAppSumo ? (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-6 text-center">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
              AppSumo Lifetime License
            </h3>
            <p className="text-purple-700 dark:text-purple-300 text-sm mb-4">
              You have a lifetime license with no recurring fees. This plan has fixed limits and no upgrade path.
              To access higher-tier features, you would need to forfeit this license and subscribe to a paid plan.
            </p>
            <Link
              to="/app/appsumo"
              className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
            >
              View license details
            </Link>
          </div>
        ) : (
        <>
          {/* Payment Method Selector */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose payment method</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentProvider("stripe")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  paymentProvider === "stripe"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                <span className="font-medium">Card</span>
              </button>
              <button
                onClick={() => setPaymentProvider("paypal")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  paymentProvider === "paypal"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                </svg>
                <span className="font-medium">PayPal</span>
              </button>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(c => c === "monthly" ? "annual" : "monthly")}
              className="relative w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                billingCycle === "annual" ? "translate-x-8" : "translate-x-1"
              }`} />
            </button>
            <span className={`text-sm ${billingCycle === "annual" ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"}`}>
              Annual
              <span className="ml-1 text-green-600 dark:text-green-400 font-medium">Save 17%</span>
            </span>
          </div>

          {/* Start Trial CTA */}
          {!isTrial && !isPaid && !subscription?.trial_ends_at && (
            <div className="text-center space-y-2">
              <button
                onClick={startTrial}
                disabled={busy}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-50"
              >
                Or start a 14-day free trial
              </button>
              <div>
                <Link
                  to="/app/appsumo"
                  className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
                >
                  Have an AppSumo code? Redeem it here
                </Link>
              </div>
            </div>
          )}

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan) => {
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const monthly = billingCycle === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
              const isCurrent = subscription?.plan === plan.id && isPaid;
              const isUpgrade = isPaid && plan.id === "pro" && subscription?.plan === "starter";
              const isDowngrade = isPaid && plan.id === "starter" && subscription?.plan === "pro";

              const getButtonText = () => {
                if (isCurrent) return "Current Plan";
                if (isUpgrade) return `Upgrade to ${plan.name}`;
                if (isDowngrade) return `Switch to ${plan.name}`;
                if (isPaid) return `Switch to ${plan.name}`;
                return `Subscribe to ${plan.name}`;
              };

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 ${
                    isCurrent
                      ? "ring-2 ring-green-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      : plan.popular
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                      Current Plan
                    </div>
                  )}

                  <h3 className={`text-lg font-semibold ${plan.popular && !isCurrent ? "text-white" : "text-gray-900 dark:text-white"}`}>
                    {plan.name}
                  </h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.popular && !isCurrent ? "text-white" : "text-gray-900 dark:text-white"}`}>
                      ${monthly}
                    </span>
                    <span className={plan.popular && !isCurrent ? "text-indigo-100" : "text-gray-500"}>/mo</span>
                  </div>

                  {billingCycle === "annual" && (
                    <p className={`mt-1 text-sm ${plan.popular && !isCurrent ? "text-indigo-100" : "text-gray-500"}`}>
                      ${price} billed annually
                    </p>
                  )}

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${plan.popular && !isCurrent ? "text-indigo-200" : "text-green-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm ${plan.popular && !isCurrent ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => checkout(plan.id)}
                    disabled={busy || isCurrent || checkoutRedirecting}
                    className={`mt-6 w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default"
                        : plan.popular
                          ? "bg-white text-indigo-600 hover:bg-indigo-50"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {checkoutRedirecting ? "Redirecting..." : getButtonText()}
                  </button>
                </div>
              );
            })}
          </div>
        </>
        )}

        {/* Manage Subscription (for paid users, not AppSumo) */}
        {isPaid && !isAppSumo && subscription?.subscription_status !== "canceling" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cancel Subscription</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You can cancel your subscription at any time. You'll retain access until the end of your billing period.
            </p>
            <button
              onClick={cancelSubscription}
              disabled={busy}
              className="mt-4 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {subscription?.subscription_status === "canceling" && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-6">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Subscription Ending</h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Your subscription will end on {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "the end of your billing period"}.
              You'll retain full access until then.
            </p>
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="text-sm">
                      <td className="py-3 text-gray-900 dark:text-white font-medium">
                        {invoice.number || invoice.id.slice(-8)}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="py-3 text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                          >
                            PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm text-blue-700 dark:text-blue-300">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="font-medium">Secure payments powered by {isPayPal ? "PayPal" : "Stripe"}</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Your payment information is encrypted and never stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </Elements>
  );
}
