// src/pages/AccountPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { getApiBase, refresh } from "@/utils/api";

type Role = "OWNER" | "ADMIN" | "USER" | "READ_ONLY";

type OrgUser = {
  id: number;
  email: string;
  role: Role;
  is_default?: boolean;
  created_at?: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

// Auth helper with cookie include and refresh on 401
async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  _retried = false
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    const tok =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {
    // ignore localStorage errors
  }

  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401 && !_retried) {
    const newTok = await refresh();
    if (newTok) {
      headers.Authorization = `Bearer ${newTok}`;
      return authFetch(input, { ...init, headers }, true);
    }
  }

  return res;
}

export default function AccountPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [defaultUserId, setDefaultUserId] = useState<number | null>(null);
  const [defaultSaveState, setDefaultSaveState] = useState<SaveState>("idle");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("USER");
  const [inviteState, setInviteState] = useState<SaveState>("idle");
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoadingUsers(true);
      setLoadError(null);
      setBanner(null);

      try {
        const res = await authFetch(`${getApiBase()}/users`);
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(
            `Failed to load users ${res.status} ${res.statusText} ${t}`
          );
        }
        const json = (await res.json()) as OrgUser[];
        if (cancelled) return;

        setUsers(Array.isArray(json) ? json : []);
        const currentDefault = json.find((u) => u.is_default);
        setDefaultUserId(currentDefault ? currentDefault.id : null);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(
            e?.message || "Could not load organization users from the server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveDefault() {
    if (!defaultUserId) {
      setBanner("Select a default user first.");
      setDefaultSaveState("error");
      return;
    }

    setDefaultSaveState("saving");
    setBanner(null);
    try {
      const res = await authFetch(`${getApiBase()}/users/default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: defaultUserId }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Failed to update default user ${res.status} ${res.statusText} ${t}`
        );
      }

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          is_default: u.id === defaultUserId,
        }))
      );
      setDefaultSaveState("saved");
      setBanner("Default user updated for this organization.");
    } catch (e: any) {
      setDefaultSaveState("error");
      setBanner(
        e?.message ||
          "Failed to update default user. No changes were saved on the server."
      );
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      setInviteState("error");
      setBanner("Enter an email address to invite.");
      return;
    }

    setInviteState("saving");
    setBanner(null);
    try {
      const res = await authFetch(`${getApiBase()}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Failed to invite user ${res.status} ${res.statusText} ${t}`
        );
      }

      const created = (await res.json()) as OrgUser;
      setUsers((prev) => [...prev, created]);
      setInviteEmail("");
      setInviteRole("USER");
      setInviteState("saved");
      setBanner(
        "User added for this organization. If email sending is enabled they will receive an invitation."
      );
    } catch (e: any) {
      setInviteState("error");
      setBanner(
        e?.message ||
          "Failed to add user. Check the email and try again."
      );
    }
  }

  function renderDefaultSaveLabel() {
    if (defaultSaveState === "saving") return "Saving";
    if (defaultSaveState === "saved") return "Saved";
    if (defaultSaveState === "error") return "Try again";
    return "Save default user";
  }

  function renderInviteLabel() {
    if (inviteState === "saving") return "Adding";
    if (inviteState === "saved") return "Added";
    if (inviteState === "error") return "Try again";
    return "Add user";
  }

  const currentUserEmail = user?.email ?? "Unknown user";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Manage your own profile and the users who belong to this organization.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/settings"
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Settings
          </Link>
          <Link
            to="/billing"
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Billing
          </Link>
        </div>
      </header>

      {banner && (
        <div
          className={[
            "rounded-lg px-3 py-2 text-sm",
            inviteState === "error" || defaultSaveState === "error"
              ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
          ].join(" ")}
        >
          {banner}
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {loadError}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Profile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Basic details for your Site2CRM account.
          </p>
        </div>

        <div className="px-6 py-6 grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Signed in as
            </div>
            <div className="sm:col-span-2 text-sm">
              {currentUserEmail}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium">Organization users</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control who can access this organization and which user is treated
              as the default for integrations and notifications.
            </p>
          </div>

          <div className="px-6 py-4">
            {loadingUsers ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Loading users
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No users found for this organization yet.
              </div>
            ) : (
              <div className="overflow-x-auto text-sm">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-4 font-medium">Default</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-gray-50 dark:border-gray-800 last:border-b-0"
                      >
                        <td className="py-2 pr-4 align-middle">
                          <input
                            type="radio"
                            name="defaultUser"
                            checked={defaultUserId === u.id}
                            onChange={() => setDefaultUserId(u.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600"
                          />
                        </td>
                        <td className="py-2 pr-4 align-middle">
                          <div className="flex flex-col">
                            <span>{u.email}</span>
                            {u.is_default && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-300">
                                Current default
                              </span>
                            )}
                            {u.email === currentUserEmail && (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-300">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4 align-middle">
                          <span className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[11px] text-gray-700 dark:text-gray-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2 pr-4 align-middle text-xs text-gray-500 dark:text-gray-400">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString()
                            : "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveDefault}
                disabled={defaultSaveState === "saving"}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {renderDefaultSaveLabel()}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium">Add user</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add another user to this organization. You can control roles at any time.
            </p>
          </div>

          <form className="px-6 py-4 space-y-4" onSubmit={handleInvite}>
            <div className="space-y-1 text-sm">
              <label className="block text-gray-700 dark:text-gray-200">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteState("idle");
                }}
                placeholder="name@example.com"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label className="block text-gray-700 dark:text-gray-200">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => {
                  setInviteRole(e.target.value as Role);
                  setInviteState("idle");
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="USER">User can work with leads and reports</option>
                <option value="ADMIN">
                  Admin manages settings and integrations
                </option>
                <option value="OWNER">
                  Owner has full control over this organization
                </option>
                <option value="READ_ONLY">
                  Read only can view but cannot change data
                </option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={inviteState === "saving"}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {renderInviteLabel()}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              When email sending is configured this can send an invitation to the
              new user. Until then you can share login details manually.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
