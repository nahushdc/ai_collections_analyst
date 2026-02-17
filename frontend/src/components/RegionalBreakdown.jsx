import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { fetchRegions } from '../api/client';

const COLOR_PALETTE = [
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-400 to-teal-500',
  'from-yellow-400 to-orange-500',
  'from-pink-500 to-rose-500',
];

// Solid colors for the donut chart (matching gradients)
const DONUT_COLORS = ['#675AF9', '#08CA97', '#FFCA54', '#0DCAF0', '#FB923C'];

// Custom tooltip for donut chart
const CustomDonutTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl">
      <p className="mb-3 font-bold text-slate-100">{data.name}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm text-slate-400">Cases:</span>
          <span className="text-sm font-semibold text-slate-200">
            {data.case_count.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm text-slate-400">Percentage:</span>
          <span className="text-sm font-semibold text-violet-300">
            {data.case_percentage}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm text-slate-400">Conversion:</span>
          <span className="text-sm font-semibold text-emerald-300">
            {data.conversion_rate}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function RegionalBreakdown() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegions()
      .then((data) => setRegions(data.regions))
      .catch((err) => console.error('Failed to load regions:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Performance by Region - Loading */}
        <div>
          <h3 className="mb-4 text-2xl font-bold text-white">Performance by Region</h3>
          <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-8 backdrop-blur-xl">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
            <div className="relative flex flex-col items-center justify-center" style={{ height: '350px' }}>
              <div className="mb-4 flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-bounce"
                    style={{
                      animationDelay: `${i * 100}ms`,
                      height: `${60 + i * 20}px`,
                      width: '40px'
                    }}
                  >
                    <div className="h-full w-full rounded-t-lg bg-gradient-to-t from-emerald-500/30 to-emerald-400/50" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">📊 Analyzing regional performance...</p>
            </div>
          </div>
        </div>

        {/* Cases by Region - Loading */}
        <div>
          <h3 className="mb-4 text-2xl font-bold text-white">Cases by Region</h3>
          <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-8 backdrop-blur-xl">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
            <div className="relative flex flex-col items-center justify-center" style={{ height: '350px' }}>
              <div className="relative">
                <div className="h-32 w-32 animate-spin rounded-full border-4 border-slate-700/30 border-t-violet-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-700/30 border-t-cyan-400" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
              </div>
              <p className="mt-6 text-sm text-slate-400">🗺️ Mapping case distribution...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (regions.length === 0) return null;

  // Find max conversion rate for scaling the bars
  const maxConversionRate = Math.max(...regions.map((r) => r.conversion_rate));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Performance by Region */}
      <div>
        <h3 className="mb-4 text-2xl font-bold text-white">Performance by Region</h3>
        <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl">
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-2xl" />
          <div className="relative z-10 p-4 sm:p-6">
            {/* Vertical Bar Chart */}
            <div className="flex h-64 items-end justify-around gap-2 sm:h-80 sm:gap-4">
              {regions.map((region, idx) => (
                <div key={region.name} className="group flex flex-1 flex-col items-center">
                  {/* Vertical bar container */}
                  <div className="relative mb-2 flex h-40 w-full items-end sm:mb-3 sm:h-56">
                    {/* Bar background */}
                    <div className="relative h-full w-full rounded-t-lg bg-slate-800/50 backdrop-blur-sm">
                      {/* Filled bar */}
                      <div
                        style={{
                          height: `${(region.conversion_rate / maxConversionRate) * 100}%`,
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length]
                        }}
                        className="absolute bottom-0 left-0 right-0 rounded-t-lg shadow-lg transition-all duration-500 group-hover:shadow-xl"
                      />

                      {/* Hover label at top */}
                      <div
                        style={{ bottom: `${(region.conversion_rate / maxConversionRate) * 100}%` }}
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-8 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <span className="whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-1 text-xs font-bold text-emerald-300">
                          {region.conversion_rate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Region label and percentage at bottom */}
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full shadow-lg sm:h-2 sm:w-2"
                        style={{
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                          boxShadow: `0 0 6px ${DONUT_COLORS[idx % DONUT_COLORS.length]}40`,
                        }}
                      />
                      <span className="text-[10px] font-semibold text-slate-300 transition-colors group-hover:text-white sm:text-xs">
                        {region.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-300 sm:text-lg">
                      {region.conversion_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cases by Region - Donut Chart */}
      <div>
        <h3 className="mb-4 text-2xl font-bold text-white">Cases by Region</h3>
        <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl">
          {/* Decorative background elements */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-2xl" />
          <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-tl from-cyan-500/10 to-transparent blur-2xl" />

          <div className="relative z-10 p-4 sm:p-6">
            {/* Chart Container */}
            <div className="relative">
              {/* Center Label - positioned absolutely BEFORE chart so it's behind */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ zIndex: 0 }}>
                <div className="rounded-lg bg-slate-900/50 px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                    Total Cases
                  </p>
                  <p className="mt-1 bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                    {regions.reduce((sum, r) => sum + r.case_count, 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Chart positioned above the center label */}
              <div className="relative" style={{ zIndex: 10 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                    <Pie
                      data={regions}
                      dataKey="case_count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={450}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#cbd5e1"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            className="text-xs font-medium"
                          >
                            {name}
                          </text>
                        );
                      }}
                      labelLine={false}
                    >
                      {regions.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                          stroke="#0f172a"
                          strokeWidth={2}
                          style={{
                            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend with custom styling */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {regions.map((region, idx) => (
                <div
                  key={region.name}
                  className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-2.5 py-1.5 backdrop-blur-sm transition-all hover:border-slate-600/70 hover:bg-slate-800/50"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shadow-lg"
                    style={{
                      backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                      boxShadow: `0 0 8px ${DONUT_COLORS[idx % DONUT_COLORS.length]}40`,
                    }}
                  />
                  <span className="text-xs font-medium text-slate-300">
                    {region.name}
                  </span>
                  <span className="ml-0.5 text-xs font-semibold text-slate-400">
                    ({region.case_percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
