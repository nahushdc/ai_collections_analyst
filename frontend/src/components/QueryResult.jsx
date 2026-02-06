import React from 'react';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';
import { exportToExcel } from '../api/client';
import { isRateColumn, formatNumber } from '../utils/formatters';

function SingleValueHero({ chart, data }) {
  if (!chart || !data || data.length === 0) return null;

  const row = data[0] || {};
  const values = chart.y_keys.map((key) => ({
    label: key,
    value: row[key],
    isRate: isRateColumn(key),
  }));

  return (
    <div className="rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-8">
      <h4 className="mb-6 text-sm font-semibold uppercase tracking-widest text-slate-400">
        {chart.title}
      </h4>
      <div className={`flex items-center justify-center gap-12 ${values.length > 1 ? '' : ''}`}>
        {values.map((v) => (
          <div key={v.label} className="text-center">
            <p className="mb-2 text-sm font-medium text-slate-400">{v.label}</p>
            <p className="bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300 bg-clip-text text-6xl font-bold text-transparent">
              {v.value != null
                ? v.isRate
                  ? `${Number(v.value).toFixed(2)}%`
                  : formatNumber(v.value)
                : '-'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QueryResult({ result, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-8">
          <Loader2 size={20} className="animate-spin text-violet-400" />
          <span className="text-slate-300">Analyzing your query...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (!result.success) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/20 to-slate-900/40 backdrop-blur-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">Query failed</p>
            <p className="mt-1 text-sm text-slate-400">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    exportToExcel(result.data, result.columns);
  };

  const isSingleValue = result.chart && result.chart.chart_type === 'single_value';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Found <span className="font-semibold text-slate-200">{result.row_count}</span> results
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500/70 hover:bg-slate-700/60 hover:text-slate-100"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {isSingleValue ? (
        <SingleValueHero chart={result.chart} data={result.data} />
      ) : (
        <ResultChart chart={result.chart} data={result.data} />
      )}
      <ResultTable columns={result.columns} data={result.data} />
    </div>
  );
}
