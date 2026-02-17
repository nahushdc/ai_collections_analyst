import React, { useState, useEffect } from 'react';
import { fetchMetrics } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const cards = [
  {
    label: 'Total AUM',
    key: 'total_aum',
    format: (v) => formatCurrency(v),
    gradient: 'from-emerald-300 to-teal-300',
    glow: 'from-emerald-500/10',
    sub: 'Assets under management',
  },
  {
    label: 'MTD Collection',
    key: 'total_collection',
    format: (v) => formatCurrency(v),
    gradient: 'from-violet-300 to-purple-300',
    glow: 'from-violet-500/10',
    sub: 'Month to date collected',
  },
  {
    label: 'Collection Rate',
    key: 'collection_rate',
    format: (v) => (v != null ? `${v.toFixed(2)}%` : '-'),
    gradient: 'from-yellow-300 to-orange-300',
    glow: 'from-yellow-400/10',
    sub: 'Overall conversion',
  },
  {
    label: 'Total Cases',
    key: 'total_cases',
    format: (v) => v?.toLocaleString('en-IN') || '-',
    gradient: 'from-violet-300 to-cyan-300',
    glow: 'from-violet-500/10',
    sub: 'Active loans in portfolio',
  },
  {
    label: 'Active States',
    key: 'active_states',
    format: (v) => v ?? '-',
    gradient: 'from-cyan-300 to-emerald-300',
    glow: 'from-cyan-500/10',
    sub: 'Geographic coverage',
  },
  {
    label: 'Avg Attempts',
    key: 'avg_attempts',
    format: (v) => (v != null ? v.toFixed(1) : '-'),
    gradient: 'from-blue-300 to-cyan-300',
    glow: 'from-blue-500/10',
    sub: 'Avg calls sent per case',
  },
  {
    label: 'Avg Connects',
    key: 'avg_connects',
    format: (v) => (v != null ? v.toFixed(2) : '-'),
    gradient: 'from-orange-300 to-amber-300',
    glow: 'from-orange-500/10',
    sub: 'Avg calls delivered per case',
  },
  {
    label: 'Date Range',
    key: 'date_range',
    format: (v, metrics) => {
      if (metrics?.date_range_start && metrics?.date_range_end) {
        return `${metrics.date_range_start} - ${metrics.date_range_end}`;
      }
      return '-';
    },
    gradient: 'from-teal-300 to-emerald-300',
    glow: 'from-teal-500/10',
    sub: 'Portfolio data period',
    smallText: true,
  },
];

export default function PortfolioOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error('Failed to load metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 className="mb-4 text-xl font-bold text-white sm:mb-6 sm:text-2xl">Portfolio Overview</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="group relative flex">
            <div
              className={`absolute inset-0 rounded-xl bg-gradient-to-br ${card.glow} to-transparent blur-lg transition-all group-hover:blur-xl`}
            />
            <div className="relative flex w-full flex-col justify-between rounded-xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-4 backdrop-blur-xl transition-all hover:border-slate-500/50 sm:p-6">
              <div>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:mb-2 sm:text-xs">
                  {card.label}
                </h4>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 animate-pulse rounded bg-gradient-to-r from-slate-700/50 to-slate-600/50 sm:h-10 sm:w-24" />
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  <p
                    className={`bg-gradient-to-r ${card.gradient} bg-clip-text font-bold text-transparent ${
                      card.smallText ? 'text-base sm:text-xl' : 'text-2xl sm:text-4xl'
                    }`}
                  >
                    {card.format(metrics?.[card.key], metrics)}
                  </p>
                )}
              </div>
              <p className="mt-3 text-[10px] text-slate-500 sm:mt-4 sm:text-xs">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
