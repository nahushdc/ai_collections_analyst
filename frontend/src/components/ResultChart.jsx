import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, LabelList,
} from 'recharts';
import { isRateColumn } from '../utils/formatters';

const BRAND_COLORS = ['#675AF9', '#08CA97', '#FFCA54', '#0DCAF0', '#FB923C', '#8B5CF6'];

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #475569',
  borderRadius: '12px',
  color: '#e2e8f0',
};

function formatTooltipValue(value, name) {
  if (typeof value !== 'number') return value;

  // Check if this is a rate/percentage column
  if (isRateColumn(name)) {
    return `${value.toFixed(2)}%`;
  }

  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Custom tooltip component for enhanced display
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl p-4 shadow-xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const isRate = isRateColumn(entry.name);
          const formattedValue = isRate
            ? `${Number(entry.value).toFixed(2)}%`
            : Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-slate-400">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-200">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatBarLabel(key) {
  const isRate = isRateColumn(key);
  return (props) => {
    const { value } = props;
    if (value == null || value === 0) return null;
    if (isRate) {
      return `${Number(value).toFixed(1)}%`;
    }
    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };
}

export default function ResultChart({ chart, data, showTooltip = false, colorIndex = 0, compact = false }) {
  if (!chart || chart.chart_type === 'table_only' || !data || data.length === 0) {
    return null;
  }

  // single_value is handled by QueryResult, not here
  if (chart.chart_type === 'single_value') {
    return null;
  }

  const chartData = data.filter(
    (row) => String(row[chart.x_key] || '') !== 'Grand Total'
  );

  if (chartData.length === 0) return null;

  const showLabels = chartData.length <= 12;
  const allYKeysAreRates = chart.y_keys.every((key) => isRateColumn(key));

  const chartHeight = compact ? 280 : 350;

  const renderBarChart = (layout = 'horizontal') => {
    const isVertical = layout === 'vertical';
    return (
      <ResponsiveContainer width="100%" height={isVertical ? Math.max(compact ? 240 : 300, chartData.length * 40) : chartHeight}>
        <BarChart
          data={chartData}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: compact ? 15 : 30, left: isVertical ? 100 : compact ? 10 : 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          {isVertical ? (
            <>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }} tickFormatter={allYKeysAreRates ? (v) => `${v}%` : undefined} />
              <YAxis
                dataKey={chart.x_key}
                type="category"
                tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 11 }}
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={chart.x_key}
                tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }}
                angle={chartData.length > 8 ? -45 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                height={chartData.length > 8 ? 80 : 30}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }} tickFormatter={allYKeysAreRates ? (v) => `${v}%` : undefined} />
            </>
          )}
          {showTooltip ? (
            <Tooltip content={<CustomTooltip />} />
          ) : (
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={formatTooltipValue}
            />
          )}
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          {chart.y_keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={BRAND_COLORS[(i + colorIndex) % BRAND_COLORS.length]}
              radius={[4, 4, 0, 0]}
              name={key}
            >
              {showLabels && (
                <LabelList
                  dataKey={key}
                  position={isVertical ? 'right' : 'top'}
                  formatter={formatBarLabel(key)}
                  style={{ fill: '#cbd5e1', fontSize: compact ? 10 : 11, fontWeight: 500 }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={compact ? 280 : 350}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey={chart.y_keys[0]}
          nameKey={chart.x_key}
          cx="50%"
          cy="50%"
          outerRadius={compact ? 90 : 120}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          labelLine={{ stroke: '#64748b' }}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={BRAND_COLORS[(i + colorIndex) % BRAND_COLORS.length]} />
          ))}
        </Pie>
        {showTooltip ? (
          <Tooltip content={<CustomTooltip />} />
        ) : (
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
        )}
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={chartData} margin={{ top: 20, right: compact ? 15 : 30, left: compact ? 10 : 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey={chart.x_key} tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }} />
        {showTooltip ? (
          <Tooltip content={<CustomTooltip />} />
        ) : (
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
        )}
        <Legend wrapperStyle={{ color: '#94a3b8' }} />
        {chart.y_keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={BRAND_COLORS[(i + colorIndex) % BRAND_COLORS.length]}
            strokeWidth={2}
            dot={{ fill: BRAND_COLORS[(i + colorIndex) % BRAND_COLORS.length], r: 4 }}
            name={key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-3 sm:p-6">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 sm:mb-4 sm:text-sm">
        {chart.title}
      </h4>
      {chart.chart_type === 'bar' && renderBarChart('horizontal')}
      {chart.chart_type === 'horizontal_bar' && renderBarChart('vertical')}
      {chart.chart_type === 'pie' && renderPieChart()}
      {chart.chart_type === 'line' && renderLineChart()}
    </div>
  );
}
