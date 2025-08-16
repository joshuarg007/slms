import React from 'react';
import DashboardCharts from '../components/DashboardCharts';

const Dashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar Placeholder */}
      <aside className="w-64 bg-white border-r hidden md:block">
        {/* You can add navigation here later */}
        <div className="h-full p-4 text-gray-400 italic">
          Sidebar Placeholder
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

          {/* Charts Section */}
          <DashboardCharts />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
