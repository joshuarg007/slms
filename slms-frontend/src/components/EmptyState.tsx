// src/components/EmptyState.tsx
// Reusable empty state component for pages with no data

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Pre-built icons for common empty states
export const EmptyStateIcons = {
  inbox: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  users: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  document: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  search: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  notification: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  trophy: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  lightning: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  link: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

const sizeClasses = {
  sm: {
    container: "py-8",
    icon: "w-12 h-12",
    title: "text-base",
    description: "text-sm",
    button: "px-4 py-2 text-sm",
  },
  md: {
    container: "py-12",
    icon: "w-16 h-16",
    title: "text-lg",
    description: "text-sm",
    button: "px-5 py-2.5 text-sm",
  },
  lg: {
    container: "py-16",
    icon: "w-20 h-20",
    title: "text-xl",
    description: "text-base",
    button: "px-6 py-3 text-base",
  },
};

export default function EmptyState({
  icon = EmptyStateIcons.inbox,
  title,
  description,
  actions = [],
  className = "",
  size = "md",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "text-center",
        sizes.container,
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      <div
        className={cn(
          "mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500",
          sizes.icon,
          "p-3"
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-gray-900 dark:text-white mb-2",
          sizes.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6",
          sizes.description
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {actions.map((action, index) => {
            const buttonClasses = cn(
              "inline-flex items-center gap-2 rounded-xl font-medium transition-colors",
              sizes.button,
              action.variant === "secondary"
                ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            );

            if (action.href) {
              return (
                <Link key={index} to={action.href} className={buttonClasses}>
                  {action.icon}
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={index}
                onClick={action.onClick}
                className={buttonClasses}
                type="button"
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function NoLeadsEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.inbox}
      title="No leads yet"
      description="Start capturing leads by embedding a form on your website or importing existing contacts."
      actions={[
        { label: "Get embed code", href: "/app/forms/embed" },
        { label: "Import leads", href: "/app/leads", variant: "secondary" },
      ]}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={EmptyStateIcons.search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
      size="sm"
    />
  );
}

export function NoTeamMembersEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.users}
      title="No team members"
      description="Invite your team members to start collaborating and tracking performance."
      actions={[
        { label: "Invite team", href: "/app/users" },
      ]}
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.notification}
      title="All caught up!"
      description="You have no new notifications. We'll let you know when something important happens."
      size="sm"
    />
  );
}

export function NoReportsEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.chart}
      title="No reports available"
      description="Reports will appear here once you have enough data. Start capturing leads to generate insights."
      actions={[
        { label: "View dashboard", href: "/app" },
      ]}
    />
  );
}

export function NoCRMConnectedEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.link}
      title="No CRM connected"
      description="Connect your CRM to sync leads automatically and enable advanced features."
      actions={[
        { label: "Connect CRM", href: "/app/integrations/crm" },
      ]}
    />
  );
}

export function NoActivityEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.lightning}
      title="No activity yet"
      description="Activity will appear here as your team logs calls, emails, and meetings."
      size="sm"
    />
  );
}

export function NoBadgesEmptyState() {
  return (
    <EmptyState
      icon={EmptyStateIcons.trophy}
      title="No badges yet"
      description="Complete challenges and hit targets to earn badges and climb the leaderboard."
      size="sm"
    />
  );
}
