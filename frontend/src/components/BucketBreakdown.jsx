import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchBuckets } from '../api/client';

const DONUT_COLORS = ['#675AF9', '#08CA97', '#FFCA54', '#0DCAF0', '#FB923C'];

const CustomTooltip = ({ active, payload }) => {
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
      </div>
    </div>
  );
};

export default function BucketBreakdown() {
  const [buckets, setBuckets] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuckets()
      .then((data) => {
        setBuckets(data.buckets);
        setTotalCases(data.total_cases);
      })
      .catch((err) => console.error('Failed to load buckets:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h3 className="mb-4 text-2xl font-bold text-white">Cases by DPD Bucket</h3>
        <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-8 backdrop-blur-xl">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
          <div className="relative flex flex-col items-center justify-center" style={{ height: '350px' }}>
            <div className="relative">
              <div className="h-32 w-32 animate-spin rounded-full border-4 border-slate-700/30 border-t-violet-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-700/30 border-t-cyan-400" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
            </div>
            <p className="mt-6 text-sm text-slate-400">Analyzing bucket distribution...</p>
          </div>
        </div>
      </div>
    );
  }

  if (buckets.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-2xl font-bold text-white">Cases by DPD Bucket</h3>
      <div className="relative overflow-hidden rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl">
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-2xl" />
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-tl from-cyan-500/10 to-transparent blur-2xl" />

        <div className="relative z-10 p-4 sm:p-6">
          <div className="relative">
            {/* Center label */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ zIndex: 0 }}>
              <div className="rounded-lg bg-slate-900/50 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                  Total Cases
                </p>
                <p className="mt-1 bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  {totalCases.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Donut chart */}
            <div className="relative" style={{ zIndex: 10 }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                  <Pie
                    data={buckets}
                    dataKey="case_count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={450}
                    label={({ cx, cy, midAngle, outerRadius, name }) => {
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
                    {buckets.map((_, idx) => (
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
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {buckets.map((bucket, idx) => (
              <div
                key={bucket.name}
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
                  {bucket.name}
                </span>
                <span className="ml-0.5 text-xs font-semibold text-slate-400">
                  ({bucket.case_percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
