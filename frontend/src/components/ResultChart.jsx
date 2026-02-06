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

function formatTooltipValue(value) {
  if (typeof value !== 'number') return value;
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
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

export default function ResultChart({ chart, data }) {
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

  const renderBarChart = (layout = 'horizontal') => {
    const isVertical = layout === 'vertical';
    return (
      <ResponsiveContainer width="100%" height={isVertical ? Math.max(300, chartData.length * 40) : 350}>
        <BarChart
          data={chartData}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: isVertical ? 100 : 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          {isVertical ? (
            <>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis
                dataKey={chart.x_key}
                type="category"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={chart.x_key}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                angle={chartData.length > 8 ? -45 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                height={chartData.length > 8 ? 80 : 30}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            </>
          )}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={formatTooltipValue}
          />
          {chart.y_keys.length > 1 && <Legend wrapperStyle={{ color: '#94a3b8' }} />}
          {chart.y_keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={BRAND_COLORS[i % BRAND_COLORS.length]}
              radius={[4, 4, 0, 0]}
              name={key}
            >
              {showLabels && (
                <LabelList
                  dataKey={key}
                  position={isVertical ? 'right' : 'top'}
                  formatter={formatBarLabel(key)}
                  style={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 500 }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey={chart.y_keys[0]}
          nameKey={chart.x_key}
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          labelLine={{ stroke: '#64748b' }}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey={chart.x_key} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
        {chart.y_keys.length > 1 && <Legend wrapperStyle={{ color: '#94a3b8' }} />}
        {chart.y_keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
            strokeWidth={2}
            dot={{ fill: BRAND_COLORS[i % BRAND_COLORS.length], r: 4 }}
            name={key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-6">
      <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
        {chart.title}
      </h4>
      {chart.chart_type === 'bar' && renderBarChart('horizontal')}
      {chart.chart_type === 'horizontal_bar' && renderBarChart('vertical')}
      {chart.chart_type === 'pie' && renderPieChart()}
      {chart.chart_type === 'line' && renderLineChart()}
    </div>
  );
}
