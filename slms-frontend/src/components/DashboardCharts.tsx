import React from 'react';
import Plot from 'react-plotly.js';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';

const layoutCommon = {
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { family: 'Inter, sans-serif', size: 12, color: '#374151' },
  margin: { l: 40, r: 20, t: 40, b: 40 },
  title: { font: { size: 16, color: '#111827' }, x: 0 },
  autosize: true,
};

const DashboardCharts: React.FC = () => {
  const { metrics, loading } = useDashboardMetrics();

  if (loading) return <p className="text-gray-500">Loading dashboard charts...</p>;
  if (!metrics) return <p className="text-red-500">Failed to load metrics.</p>;

  const { leads_by_month, lead_sources, status_counts } = metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
      {/* Leads per Month */}
      <div className="bg-white rounded-2xl shadow p-4">
        <Plot
          data={[
            {
              type: 'bar',
              x: leads_by_month.map(item => item.month),
              y: leads_by_month.map(item => item.count),
              marker: { color: '#3b82f6' }
            }
          ]}
          layout={{ ...layoutCommon, title: 'Leads per Month' }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Lead Sources */}
      <div className="bg-white rounded-2xl shadow p-4">
        <Plot
          data={[
            {
              type: 'pie',
              labels: lead_sources.map(item => item.source),
              values: lead_sources.map(item => item.count),
              textinfo: 'label+percent',
              insidetextorientation: 'radial',
              marker: { line: { color: '#ffffff', width: 2 } }
            }
          ]}
          layout={{ ...layoutCommon, title: 'Lead Sources' }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl shadow p-4">
        <Plot
          data={[
            {
              type: 'pie',
              hole: 0.4,
              labels: status_counts.map(item => item.status),
              values: status_counts.map(item => item.count),
              textinfo: 'label+percent',
              marker: { line: { color: '#ffffff', width: 2 } }
            }
          ]}
          layout={{ ...layoutCommon, title: 'Lead Status Breakdown' }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default DashboardCharts;
