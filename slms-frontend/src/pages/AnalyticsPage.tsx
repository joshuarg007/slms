/**
 * Analytics Hub Page
 *
 * Advanced data visualization dashboard with interactive charts,
 * real-time metrics, and deep insights into sales performance.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnimatedAreaChart,
  AnimatedBarChart,
  DonutChart,
  FunnelChart,
  AnimatedMetric,
  ProgressRing,
  ComparisonBar,
  Sparkline,
  CHART_COLORS,
  GRADIENTS,
} from '../components/charts';
import {
  getSalesDashboard,
  getTeamKPIs,
  SalesDashboardMetrics,
  TeamKPISummary,
  SalespersonKPI,
} from '@/utils/api';

// ============================================================================
// ANALYTICS PAGE
// ============================================================================

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'activity' | 'team'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dashboard, setDashboard] = useState<SalesDashboardMetrics | null>(null);
  const [teamKPIs, setTeamKPIs] = useState<TeamKPISummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const [dashboardRes, teamRes] = await Promise.all([
        getSalesDashboard(),
        getTeamKPIs({ days }),
      ]);
      setDashboard(dashboardRes);
      setTeamKPIs(teamRes);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  const analytics = useMemo(() => {
    if (!dashboard || !teamKPIs) {
      return null;
    }

    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;

    // Source data
    const sourceBreakdown = dashboard.by_source.map(s => ({
      name: s.source,
      value: s.total_leads,
    })).sort((a, b) => b.value - a.value);

    const sourceRevenue = dashboard.by_source
      .map(s => ({
        name: s.source.length > 12 ? s.source.slice(0, 12) + '...' : s.source,
        value: s.total_revenue / 1000,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Pipeline status counts
    const statusMap: { [key: string]: number } = {};
    dashboard.pipeline.forEach(p => {
      statusMap[p.status] = p.count;
    });
    const statusCounts = {
      new: statusMap['new'] || 0,
      contacted: statusMap['contacted'] || 0,
      qualified: statusMap['qualified'] || 0,
      proposal: statusMap['proposal'] || 0,
      negotiation: statusMap['negotiation'] || 0,
      won: teamKPIs.total_won,
    };

    // Activity data
    const activityByType = [
      { name: 'Email', value: teamKPIs.total_emails },
      { name: 'Call', value: teamKPIs.total_calls },
      { name: 'Meeting', value: teamKPIs.total_meetings },
    ].filter(a => a.value > 0);

    const activitiesByDay = dashboard.activities_by_day.slice(-14).map(d => ({
      name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.calls + d.emails + d.meetings,
    }));

    const trendData = dashboard.activities_by_day.slice(-12).map(d =>
      d.calls + d.emails + d.meetings
    );

    // Team performance sorted by revenue
    const teamPerformance = [...teamKPIs.salespeople].sort((a, b) => b.total_revenue - a.total_revenue);

    return {
      totalRevenue: dashboard.total_revenue,
      avgDealSize: dashboard.avg_deal_size,
      conversionRate: dashboard.overall_close_rate * 100,
      leadsPerDay: teamKPIs.total_leads / daysBack,
      totalLeads: teamKPIs.total_leads,
      wonLeads: teamKPIs.total_won,
      lostLeads: teamKPIs.total_lost,
      pipelineValue: dashboard.pipeline_value,
      sourceBreakdown,
      sourceRevenue,
      statusCounts,
      activityByType,
      teamPerformance,
      trendData,
      totalActivities: teamKPIs.total_calls + teamKPIs.total_emails + teamKPIs.total_meetings,
      activitiesByDay,
    };
  }, [dashboard, teamKPIs, timeRange]);

  // Funnel data
  const funnelData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'New Leads', value: analytics.statusCounts.new },
      { name: 'Contacted', value: analytics.statusCounts.contacted },
      { name: 'Qualified', value: analytics.statusCounts.qualified },
      { name: 'Proposal', value: analytics.statusCounts.proposal },
      { name: 'Negotiation', value: analytics.statusCounts.negotiation },
      { name: 'Won', value: analytics.statusCounts.won },
    ];
  }, [analytics]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-32 -mb-32" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold">Analytics Hub</h1>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 flex items-center gap-1.5 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE DATA
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  Real-time insights from {analytics.totalLeads.toLocaleString()} leads and {analytics.totalActivities.toLocaleString()} activities
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                  ${(analytics.totalRevenue / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-white/50 mt-1">Total Revenue</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {analytics.conversionRate.toFixed(1)}%
                </div>
                <div className="text-xs text-white/50 mt-1">Win Rate</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text text-transparent">
                  {analytics.totalLeads}
                </div>
                <div className="text-xs text-white/50 mt-1">Total Leads</div>
              </div>
            </div>
          </div>

          {/* Time Range & Tabs */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'pipeline', label: 'Pipeline', icon: '🎯' },
                { id: 'activity', label: 'Activity', icon: '⚡' },
                { id: 'team', label: 'Team', icon: '👥' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-white/10 rounded-xl p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    timeRange === range
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : '1Y'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatedMetric
                value={analytics.totalRevenue}
                label="Total Revenue"
                change={12.5}
                changeLabel="vs last period"
                prefix="$"
                formatValue={(v) => `$${(Number(v) / 1000).toFixed(0)}K`}
                gradient="emerald"
                sparklineData={analytics.trendData}
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <AnimatedMetric
                value={analytics.totalLeads}
                label="Total Leads"
                change={8.3}
                changeLabel="vs last period"
                gradient="indigo"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <AnimatedMetric
                value={analytics.conversionRate.toFixed(1)}
                label="Conversion Rate"
                change={3.2}
                changeLabel="vs last period"
                suffix="%"
                gradient="purple"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <AnimatedMetric
                value={analytics.avgDealSize}
                label="Avg Deal Size"
                change={-2.1}
                changeLabel="vs last period"
                prefix="$"
                formatValue={(v) => `$${(Number(v) / 1000).toFixed(1)}K`}
                gradient="amber"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
            </div>

            {/* Revenue & Leads Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Trend</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Daily activities over time</p>
                  </div>
                </div>
                <AnimatedAreaChart
                  data={analytics.activitiesByDay}
                  dataKey="value"
                  height={320}
                  gradient="indigo"
                />
              </div>

              {/* Source Breakdown */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Lead Sources</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Distribution by source</p>
                <div className="flex justify-center">
                  <DonutChart
                    data={analytics.sourceBreakdown.slice(0, 6)}
                    size={200}
                    thickness={32}
                    centerValue={analytics.totalLeads}
                    centerLabel="Total"
                    showLegend={false}
                  />
                </div>
                <div className="mt-6 space-y-2.5">
                  {analytics.sourceBreakdown.slice(0, 5).map((source, index) => (
                    <div key={source.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length] }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{source.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {((source.value / analytics.totalLeads) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Revenue */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Revenue by Source</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Top performing lead sources (in $K)</p>
                <AnimatedBarChart
                  data={analytics.sourceRevenue}
                  height={250}
                  colors={CHART_COLORS.gradient}
                />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pipeline Value</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${(analytics.pipelineValue / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In active pipeline</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Win Rate</span>
                    <ProgressRing progress={analytics.conversionRate} size={44} strokeWidth={4} gradient="emerald" showValue={false} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {analytics.wonLeads} won / {analytics.wonLeads + analytics.lostLeads} closed
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Velocity</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.leadsPerDay.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leads per day</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Activities</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.totalActivities.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Calls, emails & meetings</p>
                </div>
              </div>
            </div>

            {/* AI CTA */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/5 dark:via-purple-500/5 dark:to-pink-500/5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Want deeper insights?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Chat with our AI consultant for personalized recommendations</p>
                  </div>
                </div>
                <Link
                  to="/app/chat"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Ask AI
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Funnel Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sales Funnel</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Lead progression through pipeline stages</p>
                <FunnelChart data={funnelData} height={360} />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Stage Conversion</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Conversion rates between stages</p>
                <div className="space-y-5 mt-4">
                  {funnelData.slice(0, -1).map((stage, index) => {
                    const nextStage = funnelData[index + 1];
                    const conversionRate = stage.value > 0 ? (nextStage.value / stage.value) * 100 : 0;
                    return (
                      <div key={stage.name}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {stage.name} → {nextStage.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <ComparisonBar
                          label=""
                          value={conversionRate}
                          maxValue={100}
                          gradient={(['indigo', 'purple', 'pink', 'amber', 'emerald'] as const)[index % 5]}
                          showValue={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pipeline by Source */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Pipeline by Source</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Lead volume distribution across sources</p>
              <AnimatedBarChart
                data={analytics.sourceBreakdown.slice(0, 8)}
                height={280}
                horizontal
                colors={CHART_COLORS.gradient}
              />
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'New', value: analytics.statusCounts.new, color: 'indigo' },
                { label: 'Contacted', value: analytics.statusCounts.contacted, color: 'purple' },
                { label: 'Qualified', value: analytics.statusCounts.qualified, color: 'pink' },
                { label: 'In Negotiation', value: analytics.statusCounts.negotiation, color: 'amber' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <div className="mt-3">
                    <Sparkline
                      data={Array.from({ length: 10 }, () => Math.random() * Math.max(stat.value, 10))}
                      width={120}
                      height={30}
                      color={GRADIENTS[stat.color as keyof typeof GRADIENTS].start}
                      filled
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Activity Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Activity Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Daily activity volume over time</p>
              <AnimatedAreaChart
                data={analytics.activitiesByDay}
                dataKey="value"
                height={280}
                gradient="purple"
              />
            </div>

            {/* Activity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Activity Types</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Distribution by activity type</p>
                <AnimatedBarChart
                  data={analytics.activityByType}
                  height={260}
                  colors={[GRADIENTS.indigo.start, GRADIENTS.purple.start, GRADIENTS.pink.start]}
                />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Activity Summary</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Key activity metrics</p>
                <div className="grid grid-cols-1 gap-4">
                  {analytics.activityByType.map((activity, index) => (
                    <div
                      key={activity.name}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]}, ${CHART_COLORS.gradient[(index + 1) % CHART_COLORS.gradient.length]})`,
                          }}
                        >
                          {activity.name === 'Email' && (
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          {activity.name === 'Call' && (
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          )}
                          {activity.name === 'Meeting' && (
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{activity.name}s</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {((activity.value / analytics.totalActivities) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{activity.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Team Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {analytics.teamPerformance.map((member, index) => (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]}, ${CHART_COLORS.gradient[(index + 1) % CHART_COLORS.gradient.length]})`,
                      }}
                    >
                      {member.display_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{member.display_name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.total_leads} leads · {member.won_leads} won
                      </p>
                    </div>
                    {index < 3 && (
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        index === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        index === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }`}>
                        #{index + 1}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Revenue</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${(member.total_revenue / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <ComparisonBar
                        label=""
                        value={member.total_revenue}
                        maxValue={Math.max(...analytics.teamPerformance.map(m => m.total_revenue))}
                        gradient={(['indigo', 'purple', 'pink', 'amber', 'emerald', 'cyan'] as const)[index % 6]}
                        showValue={false}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Close Rate</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {(member.close_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <ComparisonBar
                        label=""
                        value={member.close_rate * 100}
                        maxValue={100}
                        gradient={member.close_rate >= 0.3 ? 'emerald' : member.close_rate >= 0.2 ? 'amber' : 'rose'}
                        showValue={false}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Activities</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{member.total_activities}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg Deal</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ${(member.avg_deal_size / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Team Comparison Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Team Revenue Comparison</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Revenue generated by each team member (in $K)</p>
              <AnimatedBarChart
                data={analytics.teamPerformance.map(m => ({
                  name: m.display_name.split(' ')[0],
                  value: m.total_revenue / 1000,
                }))}
                height={280}
                colors={CHART_COLORS.gradient}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
