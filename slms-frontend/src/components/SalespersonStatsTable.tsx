// src/components/SalespersonStatsTable.tsx
import React from "react";

export type Row = {
  owner_id: string;
  owner_name: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
};

type Props = {
  rows: Row[];
};

export default function SalespersonStatsTable({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Salesperson stats</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr className="text-gray-900 dark:text-gray-100">
              <th className="px-4 py-3 text-left font-semibold">Owner</th>
              <th className="px-4 py-3 text-left font-semibold">Emails</th>
              <th className="px-4 py-3 text-left font-semibold">Calls</th>
              <th className="px-4 py-3 text-left font-semibold">Meetings</th>
              <th className="px-4 py-3 text-left font-semibold">New deals</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-700 dark:text-gray-200" colSpan={5}>
                  No data.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.owner_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">{r.owner_name}</td>
                  <td className="px-4 py-3">{r.emails_last_n_days}</td>
                  <td className="px-4 py-3">{r.calls_last_n_days}</td>
                  <td className="px-4 py-3">{r.meetings_last_n_days}</td>
                  <td className="px-4 py-3">{r.new_deals_last_n_days}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
