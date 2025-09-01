// src/components/StatsCards.tsx
type Props = {
  emails: number;
  calls: number;
  meetings: number;
  newDeals: number;
};

export default function StatsCards({ emails, calls, meetings, newDeals }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard label="Emails" value={emails} />
      <StatCard label="Calls" value={calls} />
      <StatCard label="Meetings" value={meetings} />
      <StatCard label="New deals" value={newDeals} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow p-5">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</div>
      <div className="text-4xl font-semibold mt-1 text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
