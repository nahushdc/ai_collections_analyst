import React, { useState, useEffect } from 'react';
import { fetchRegions } from '../api/client';

const COLOR_PALETTE = [
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-400 to-teal-500',
  'from-yellow-400 to-orange-500',
  'from-pink-500 to-rose-500',
];

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
      <div>
        <h3 className="mb-6 text-2xl font-bold text-white">Cases by Region</h3>
        <div className="rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-8 backdrop-blur-xl">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-700/50" />
                  <div className="h-6 w-12 animate-pulse rounded bg-slate-700/50" />
                </div>
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-700/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (regions.length === 0) return null;

  return (
    <div>
      <h3 className="mb-6 text-2xl font-bold text-white">Cases by Region</h3>
      <div className="relative rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-8 backdrop-blur-xl">
        <div className="absolute -ml-20 -mt-20 left-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent" />
        <div className="relative z-10 space-y-6">
          {regions.map((region, idx) => (
            <div key={region.name} className="group space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300 transition-colors group-hover:text-white">
                  {region.name}
                </span>
                <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent">
                  {region.case_percentage}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-700/30 backdrop-blur-sm">
                <div
                  style={{ width: `${region.case_percentage}%` }}
                  className={`h-full rounded-full bg-gradient-to-r ${COLOR_PALETTE[idx % COLOR_PALETTE.length]} shadow-lg transition-all duration-500 hover:shadow-xl`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
