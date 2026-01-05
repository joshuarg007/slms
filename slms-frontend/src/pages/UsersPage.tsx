// src/pages/UsersPage.tsx
import { useEffect, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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

const roleColors: Record<Role, { bg: string; text: string; border: string }> = {
  OWNER: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  ADMIN: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  USER: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
  },
  READ_ONLY: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
};

const roleDescriptions: Record<Role, string> = {
  OWNER: "Full control over organization",
  ADMIN: "Manage settings and users",
  USER: "Work with leads and reports",
  READ_ONLY: "View-only access",
};

// Safe lookup helpers that default to USER styling for unknown roles
function getRoleColors(role: string) {
  return roleColors[role as Role] || roleColors.USER;
}

function getRoleDescription(role: string) {
  return roleDescriptions[role as Role] || "Team member";
}

export default function UsersPage() {
  useDocumentTitle("Users");
  const { user } = useAuth();

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [defaultUserId, setDefaultUserId] = useState<number | null>(null);
  const [defaultSaveState, setDefaultSaveState] = useState<SaveState>("idle");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("USER");
  const [inviteState, setInviteState] = useState<SaveState>("idle");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

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
          throw new Error(`Failed to load users ${res.status} ${res.statusText} ${t}`);
        }
        const json = (await res.json()) as OrgUser[];
        if (cancelled) return;

        setUsers(Array.isArray(json) ? json : []);
        const currentDefault = json.find((u) => u.is_default);
        setDefaultUserId(currentDefault ? currentDefault.id : null);
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Could not load organization users from the server.";
          setLoadError(message);
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
      setBanner({ type: "error", message: "Select a default user first." });
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
        throw new Error(`Failed to update default user ${res.status} ${res.statusText} ${t}`);
      }

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          is_default: u.id === defaultUserId,
        }))
      );
      setDefaultSaveState("saved");
      setBanner({ type: "success", message: "Default user updated for this organization." });
      setTimeout(() => setDefaultSaveState("idle"), 2000);
    } catch (e: unknown) {
      setDefaultSaveState("error");
      const message = e instanceof Error ? e.message : "Failed to update default user.";
      setBanner({ type: "error", message });
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      setInviteState("error");
      setBanner({ type: "error", message: "Enter an email address to invite." });
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
        throw new Error(`Failed to invite user ${res.status} ${res.statusText} ${t}`);
      }

      const created = (await res.json()) as OrgUser;
      setUsers((prev) => [...prev, created]);
      setInviteEmail("");
      setInviteRole("USER");
      setInviteState("saved");
      setBanner({ type: "success", message: `${email} has been added to your organization.` });
      setTimeout(() => setInviteState("idle"), 2000);
    } catch (e: unknown) {
      setInviteState("error");
      const message = e instanceof Error ? e.message : "Failed to add user.";
      setBanner({ type: "error", message });
    }
  }

  const currentUserEmail = user?.email ?? "Unknown user";

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    total: users.length,
    owners: users.filter((u) => u.role === "OWNER").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    users: users.filter((u) => u.role === "USER").length,
    readOnly: users.filter((u) => u.role === "READ_ONLY").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization's users and permissions
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {stats.total} {stats.total === 1 ? "member" : "members"}
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
            banner.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {banner.type === "error" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {banner.message}
          <button onClick={() => setBanner(null)} className="ml-auto p-1 hover:opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {loadError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Owners", count: stats.owners, color: "purple" },
          { label: "Admins", count: stats.admins, color: "blue" },
          { label: "Users", count: stats.users, color: "gray" },
          { label: "Read Only", count: stats.readOnly, color: "amber" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users List */}
        <section className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owners</option>
                <option value="ADMIN">Admins</option>
                <option value="USER">Users</option>
                <option value="READ_ONLY">Read Only</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading team members...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || roleFilter !== "ALL"
                    ? "No users match your filters"
                    : "No team members yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      defaultUserId === u.id
                        ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20"
                        : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="defaultUser"
                        checked={defaultUserId === u.id}
                        onChange={() => setDefaultUserId(u.id)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                      />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
                        <span className="text-sm font-semibold text-white">
                          {u.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{u.email}</span>
                          {u.email === currentUserEmail && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              You
                            </span>
                          )}
                          {u.is_default && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {getRoleDescription(u.role)} &bull; Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getRoleColors(u.role).bg} ${getRoleColors(u.role).text} ${getRoleColors(u.role).border}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {users.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a user to set as the default for integrations
                </p>
                <button
                  type="button"
                  onClick={handleSaveDefault}
                  disabled={defaultSaveState === "saving"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {defaultSaveState === "saving" ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : defaultSaveState === "saved" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved!
                    </>
                  ) : (
                    "Set as Default"
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Add User */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden h-fit">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Team Member</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Invite someone to join</p>
              </div>
            </div>
          </div>

          <form className="p-6 space-y-4" onSubmit={handleInvite}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteState("idle");
                }}
                placeholder="colleague@company.com"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Role
              </label>
              <div className="space-y-2">
                {(["USER", "ADMIN", "OWNER", "READ_ONLY"] as Role[]).map((role) => (
                  <label
                    key={role}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      inviteRole === role
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={inviteRole === role}
                      onChange={() => setInviteRole(role)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[role].bg} ${roleColors[role].text}`}>
                          {role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {roleDescriptions[role]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={inviteState === "saving" || !inviteEmail.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {inviteState === "saving" ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : inviteState === "saved" ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Added!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Send Invitation
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              The new user will receive login credentials via email
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
