// src/components/StatsCards.tsx
import React from "react";

export type Row = {
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
};

type Props = {
  rows: Row[];
  days: number;
};

export default function StatsCards({ rows, days }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.emails += r.emails_last_n_days || 0;
      acc.calls += r.calls_last_n_days || 0;
      acc.meetings += r.meetings_last_n_days || 0;
      acc.deals += r.new_deals_last_n_days || 0;
      return acc;
    },
    { emails: 0, calls: 0, meetings: 0, deals: 0 }
  );

  const top = rows
    .map((r) => ({
      name: r.owner_name || r.owner_email || "Owner",
      score:
        (r.emails_last_n_days || 0) +
        (r.calls_last_n_days || 0) +
        (r.meetings_last_n_days || 0) +
        (r.new_deals_last_n_days || 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const Card = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card label={`Emails (last ${days}d)`} value={totals.emails.toLocaleString()} />
      <Card label={`Calls (last ${days}d)`} value={totals.calls.toLocaleString()} />
      <Card label={`Meetings (last ${days}d)`} value={totals.meetings.toLocaleString()} />
      <Card label={`New Deals (last ${days}d)`} value={totals.deals.toLocaleString()} />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Top performer (last {days}d)
        </div>
        {top ? (
          <div className="mt-2">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {top.name}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {top.score.toLocaleString()} total actions
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">No data</div>
        )}
      </div>
    </div>
  );
}
