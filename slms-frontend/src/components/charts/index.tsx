/**
 * Advanced Chart Components Library
 *
 * A collection of beautiful, animated chart components for data visualization.
 * Built with Recharts and Framer Motion for smooth animations.
 */

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// COLOR PALETTES
// ============================================================================

export const CHART_COLORS = {
  primary: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  pink: ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'],
  cyan: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
  gradient: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
  rainbow: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#8b5cf6'],
};

export const GRADIENTS = {
  indigo: { start: '#6366f1', end: '#4f46e5' },
  purple: { start: '#8b5cf6', end: '#7c3aed' },
  pink: { start: '#ec4899', end: '#db2777' },
  cyan: { start: '#06b6d4', end: '#0891b2' },
  emerald: { start: '#10b981', end: '#059669' },
  amber: { start: '#f59e0b', end: '#d97706' },
  rose: { start: '#f43f5e', end: '#e11d48' },
};

// ============================================================================
// ANIMATED AREA CHART
// ============================================================================

interface AreaChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface AnimatedAreaChartProps {
  data: AreaChartData[];
  dataKey?: string;
  secondaryDataKey?: string;
  height?: number;
  gradient?: keyof typeof GRADIENTS;
  showGrid?: boolean;
  showAxis?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  fillOpacity?: number;
}

export const AnimatedAreaChart: React.FC<AnimatedAreaChartProps> = ({
  data,
  dataKey = 'value',
  secondaryDataKey,
  height = 300,
  gradient = 'indigo',
  showGrid = true,
  showAxis = true,
  showTooltip = true,
  animate = true,
  fillOpacity = 0.3,
}) => {
  const [mounted, setMounted] = useState(false);
  const gradientId = `gradient-${gradient}-${Math.random().toString(36).substr(2, 9)}`;
  const secondaryGradientId = `gradient-secondary-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (animate) {
      setTimeout(() => setMounted(true), 100);
    } else {
      setMounted(true);
    }
  }, [animate]);

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GRADIENTS[gradient].start} stopOpacity={0.8} />
              <stop offset="95%" stopColor={GRADIENTS[gradient].end} stopOpacity={0.1} />
            </linearGradient>
            {secondaryDataKey && (
              <linearGradient id={secondaryGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GRADIENTS.purple.start} stopOpacity={0.8} />
                <stop offset="95%" stopColor={GRADIENTS.purple.end} stopOpacity={0.1} />
              </linearGradient>
            )}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              vertical={false}
            />
          )}
          {showAxis && (
            <>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
            </>
          )}
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '12px 16px',
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={GRADIENTS[gradient].start}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            fillOpacity={fillOpacity}
            animationDuration={mounted ? 1500 : 0}
            animationBegin={0}
          />
          {secondaryDataKey && (
            <Area
              type="monotone"
              dataKey={secondaryDataKey}
              stroke={GRADIENTS.purple.start}
              strokeWidth={2}
              fill={`url(#${secondaryGradientId})`}
              fillOpacity={fillOpacity * 0.7}
              animationDuration={mounted ? 1500 : 0}
              animationBegin={200}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================================================
// ANIMATED BAR CHART
// ============================================================================

interface BarChartData {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

interface AnimatedBarChartProps {
  data: BarChartData[];
  dataKey?: string;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  showAxis?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  stackedKeys?: string[];
  barRadius?: number;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  dataKey = 'value',
  height = 300,
  colors = CHART_COLORS.primary,
  showGrid = true,
  showAxis = true,
  horizontal = false,
  stacked = false,
  stackedKeys = [],
  barRadius = 8,
}) => {
  const ChartComponent = horizontal ? BarChart : BarChart;
  const layout = horizontal ? 'vertical' : 'horizontal';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: horizontal ? 60 : -20, bottom: 0 }}
        >
          <defs>
            {colors.map((color, index) => (
              <linearGradient key={index} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              horizontal={!horizontal}
              vertical={horizontal}
            />
          )}
          {showAxis && (
            <>
              <XAxis
                dataKey={horizontal ? undefined : 'name'}
                type={horizontal ? 'number' : 'category'}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                dataKey={horizontal ? 'name' : undefined}
                type={horizontal ? 'category' : 'number'}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
                width={horizontal ? 80 : 40}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '12px 16px',
            }}
            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            itemStyle={{ color: '#f3f4f6' }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          {stacked && stackedKeys.length > 0 ? (
            stackedKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="stack"
                fill={`url(#bar-gradient-${index % colors.length})`}
                radius={index === stackedKeys.length - 1 ? [barRadius, barRadius, 0, 0] : 0}
                animationDuration={1500}
                animationBegin={index * 100}
              />
            ))
          ) : (
            <Bar
              dataKey={dataKey}
              fill={`url(#bar-gradient-0)`}
              radius={[barRadius, barRadius, barRadius, barRadius]}
              animationDuration={1500}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`url(#bar-gradient-${index % colors.length})`} />
              ))}
            </Bar>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================================================
// RADIAL GAUGE CHART
// ============================================================================

interface RadialGaugeProps {
  value: number;
  maxValue?: number;
  label?: string;
  sublabel?: string;
  size?: number;
  thickness?: number;
  gradient?: keyof typeof GRADIENTS;
  showPercentage?: boolean;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  maxValue = 100,
  label,
  sublabel,
  size = 200,
  thickness = 20,
  gradient = 'indigo',
  showPercentage = true,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const gradientId = `radial-gradient-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const data = [
    { name: 'value', value: animatedValue, fill: `url(#${gradientId})` },
  ];

  const backgroundData = [
    { name: 'bg', value: 100, fill: 'currentColor' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius={`${100 - (thickness / size) * 200}%`}
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          data={backgroundData}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={thickness / 2}
            className="text-gray-200 dark:text-gray-700"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={`${100 - (thickness / size) * 200}%`}
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={data}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={GRADIENTS[gradient].start} />
                <stop offset="100%" stopColor={GRADIENTS[gradient].end} />
              </linearGradient>
            </defs>
            <RadialBar
              dataKey="value"
              cornerRadius={thickness / 2}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 dark:text-white"
          >
            {Math.round(animatedValue)}%
          </motion.span>
        )}
        {label && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {sublabel}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// SPARKLINE CHART
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  filled?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 30,
  color = GRADIENTS.indigo.start,
  showDot = true,
  filled = false,
}) => {
  const chartData = data.map((value, index) => ({ index, value }));
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        {filled ? (
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={showDot ? { r: 2, fill: color } : false}
              activeDot={{ r: 4, fill: color }}
              animationDuration={1000}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// DONUT CHART
// ============================================================================

interface DonutChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  colors?: string[];
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  thickness = 40,
  showLegend = true,
  centerLabel,
  centerValue,
  colors = CHART_COLORS.rainbow,
}) => {
  const innerRadius = (size / 2) - thickness;
  const outerRadius = size / 2 - 10;

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -90 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 0.7, type: 'spring' }}
      className="flex flex-col items-center gap-4"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
              animationDuration={1500}
              animationBegin={100}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '12px 16px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// FUNNEL CHART
// ============================================================================

interface FunnelData {
  name: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelData[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  data,
  height = 400,
  showLabels = true,
  showValues = true,
  animated = true,
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const colors = CHART_COLORS.gradient;

  return (
    <div style={{ height }} className="flex flex-col justify-between py-4">
      {data.map((item, index) => {
        const widthPercent = (item.value / maxValue) * 100;
        const color = item.color || colors[index % colors.length];

        return (
          <motion.div
            key={item.name}
            initial={animated ? { opacity: 0, scaleX: 0 } : false}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative flex items-center"
          >
            {showLabels && (
              <div className="w-32 pr-4 text-right">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.name}
                </span>
              </div>
            )}
            <div className="flex-1 relative">
              <div
                className="h-12 rounded-lg transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${widthPercent}%`,
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  boxShadow: `0 4px 15px ${color}40`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  }}
                />
                {showValues && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm drop-shadow">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================================================
// HEAT MAP
// ============================================================================

interface HeatMapData {
  day: string;
  hour: number;
  value: number;
}

interface HeatMapProps {
  data: HeatMapData[];
  height?: number;
  colorScale?: string[];
}

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  height = 200,
  colorScale = ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'],
}) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const maxValue = Math.max(...data.map(d => d.value));

  const getColor = (value: number) => {
    if (value === 0) return colorScale[0];
    const index = Math.min(
      Math.floor((value / maxValue) * (colorScale.length - 1)),
      colorScale.length - 1
    );
    return colorScale[index];
  };

  const getValue = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item?.value || 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="overflow-x-auto"
    >
      <div className="min-w-[600px]" style={{ height }}>
        <div className="flex">
          <div className="w-12" />
          <div className="flex-1 flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            {[0, 6, 12, 18, 23].map(h => (
              <span key={h}>{h}:00</span>
            ))}
          </div>
        </div>
        {days.map((day, dayIndex) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: dayIndex * 0.05 }}
            className="flex items-center mb-1"
          >
            <div className="w-12 text-xs text-gray-500 dark:text-gray-400">
              {day}
            </div>
            <div className="flex-1 flex gap-1">
              {hours.map(hour => {
                const value = getValue(day, hour);
                return (
                  <motion.div
                    key={hour}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (dayIndex * 24 + hour) * 0.002 }}
                    className="flex-1 h-6 rounded-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: getColor(value) }}
                    title={`${day} ${hour}:00 - ${value} activities`}
                  />
                );
              })}
            </div>
          </motion.div>
        ))}
        <div className="flex items-center justify-end mt-4 gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Less</span>
          {colorScale.map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-xs text-gray-500 dark:text-gray-400">More</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// ANIMATED METRIC CARD
// ============================================================================

interface AnimatedMetricProps {
  value: number | string;
  label: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  gradient?: keyof typeof GRADIENTS;
  sparklineData?: number[];
  prefix?: string;
  suffix?: string;
  formatValue?: (value: number | string) => string;
}

export const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  label,
  change,
  changeLabel,
  icon,
  gradient = 'indigo',
  sparklineData,
  prefix = '',
  suffix = '',
  formatValue,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const isPositiveChange = change !== undefined && change >= 0;

  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1500;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayValue(numericValue);
          clearInterval(timer);
        } else {
          setDisplayValue(current);
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [numericValue]);

  const formattedValue = formatValue
    ? formatValue(displayValue)
    : typeof value === 'number'
      ? `${prefix}${displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formattedValue}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2 gap-1">
              <span className={`flex items-center text-sm font-medium ${
                isPositiveChange ? 'text-emerald-600' : 'text-red-500'
              }`}>
                <svg
                  className={`w-4 h-4 mr-0.5 ${isPositiveChange ? '' : 'rotate-180'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${GRADIENTS[gradient].start}, ${GRADIENTS[gradient].end})`,
                boxShadow: `0 8px 20px ${GRADIENTS[gradient].start}40`,
              }}
            >
              {icon}
            </div>
          )}
          {sparklineData && (
            <Sparkline
              data={sparklineData}
              color={GRADIENTS[gradient].start}
              filled
              width={80}
              height={32}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// PROGRESS RING
// ============================================================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  gradient?: keyof typeof GRADIENTS;
  label?: string;
  showValue?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  gradient = 'indigo',
  label,
  showValue = true,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;
  const gradientId = `progress-ring-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(Math.min(progress, 100)), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative inline-flex items-center justify-center"
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GRADIENTS[gradient].start} />
            <stop offset="100%" stopColor={GRADIENTS[gradient].end} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(animatedProgress)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {label}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// COMPARISON BAR
// ============================================================================

interface ComparisonBarProps {
  label: string;
  value: number;
  maxValue: number;
  previousValue?: number;
  gradient?: keyof typeof GRADIENTS;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  label,
  value,
  maxValue,
  previousValue,
  gradient = 'indigo',
  showValue = true,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const previousPercentage = previousValue ? Math.min((previousValue / maxValue) * 100, 100) : undefined;
  const gradientId = `comparison-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {showValue && (
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatValue(value)}
          </span>
        )}
      </div>
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={GRADIENTS[gradient].start} />
              <stop offset="100%" stopColor={GRADIENTS[gradient].end} />
            </linearGradient>
          </defs>
        </svg>
        {previousPercentage !== undefined && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${previousPercentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute inset-y-0 left-0 bg-gray-400 dark:bg-gray-500 opacity-50 rounded-full"
          />
        )}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${GRADIENTS[gradient].start}, ${GRADIENTS[gradient].end})` }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================================
// STAT TREND
// ============================================================================

interface StatTrendProps {
  label: string;
  value: string | number;
  trend: number;
  trendLabel?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
}

export const StatTrend: React.FC<StatTrendProps> = ({
  label,
  value,
  trend,
  trendLabel = 'vs last period',
  sparklineData,
  icon,
}) => {
  const isPositive = trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-emerald-600' : 'text-red-500'
        }`}>
          <svg
            className={`w-4 h-4 ${isPositive ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {Math.abs(trend)}%
        </div>
        {sparklineData ? (
          <Sparkline
            data={sparklineData}
            color={isPositive ? '#10b981' : '#ef4444'}
            width={60}
            height={20}
          />
        ) : (
          <span className="text-xs text-gray-400">{trendLabel}</span>
        )}
      </div>
    </motion.div>
  );
};

export default {
  AnimatedAreaChart,
  AnimatedBarChart,
  RadialGauge,
  Sparkline,
  DonutChart,
  FunnelChart,
  HeatMap,
  AnimatedMetric,
  ProgressRing,
  ComparisonBar,
  StatTrend,
  CHART_COLORS,
  GRADIENTS,
};
