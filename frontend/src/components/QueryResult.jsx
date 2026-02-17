import React from 'react';
import { Download, AlertCircle } from 'lucide-react';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';
import QueryLoadingState from './QueryLoadingState';
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
    <div className="rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-5 sm:p-8">
      <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400 sm:mb-6">
        {chart.title}
      </h4>
      <div className={`flex flex-wrap items-center justify-center gap-6 sm:gap-12 ${values.length > 1 ? '' : ''}`}>
        {values.map((v) => (
          <div key={v.label} className="text-center">
            <p className="mb-2 text-sm font-medium text-slate-400">{v.label}</p>
            <p className="bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
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

export default function QueryResult({ result, loading, queryText }) {
  if (loading) {
    return <QueryLoadingState queryText={queryText} variant="standard" />;
  }

  if (!result) return null;

  if (!result.success) {
    const isTechnical = result.error && (result.error.startsWith('LLM error:') || result.error.startsWith('Execution error:'));
    const friendlyMessage = isTechnical
      ? "Something went wrong while processing your query. Please try rephrasing your question."
      : result.error;
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-slate-900/40 backdrop-blur-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-300">Couldn't get results</p>
            <p className="mt-1 text-sm text-slate-300">{friendlyMessage}</p>
            <p className="mt-3 text-xs text-slate-500">Try rephrasing your question or ask about available metrics like efficiency, PTP, connectivity, or costs.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    exportToExcel(result.data, result.columns);
  };

  const isSingleValue = result.chart && result.chart.chart_type === 'single_value';

  // Split y_keys into rate (%) and amount groups for separate charts
  const chartGroups = (() => {
    if (!result.chart || !result.chart.y_keys || result.chart.y_keys.length <= 1) return null;
    const rateKeys = result.chart.y_keys.filter(k => isRateColumn(k));
    const amountKeys = result.chart.y_keys.filter(k => !isRateColumn(k));
    // Only split if we have both types
    if (rateKeys.length > 0 && amountKeys.length > 0) {
      return { rateKeys, amountKeys };
    }
    return null;
  })();

  const renderCharts = () => {
    if (isSingleValue) {
      return <SingleValueHero chart={result.chart} data={result.data} />;
    }

    // Mixed types (e.g. SMS Cost + Amount Efficiency) — split into separate groups
    if (chartGroups) {
      const charts = [];
      // Rate charts: split each into its own chart
      if (chartGroups.rateKeys.length > 1) {
        charts.push(
          <div key="rates" className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {chartGroups.rateKeys.map((key, i) => (
              <ResultChart
                key={key}
                chart={{ ...result.chart, y_keys: [key], title: key }}
                data={result.data}
                colorIndex={i}
                compact
              />
            ))}
          </div>
        );
      } else if (chartGroups.rateKeys.length === 1) {
        charts.push(
          <ResultChart
            key={chartGroups.rateKeys[0]}
            chart={{ ...result.chart, y_keys: chartGroups.rateKeys, title: chartGroups.rateKeys[0] }}
            data={result.data}
          />
        );
      }
      // Amount charts: keep together in a single grouped bar
      if (chartGroups.amountKeys.length > 0) {
        charts.push(
          <ResultChart
            key="amounts"
            chart={{ ...result.chart, y_keys: chartGroups.amountKeys, title: chartGroups.amountKeys.join(' & ') }}
            data={result.data}
            colorIndex={chartGroups.rateKeys.length}
          />
        );
      }
      return <div className="space-y-6">{charts}</div>;
    }

    // All rate columns — split each into its own chart
    if (result.chart && result.chart.y_keys && result.chart.y_keys.length > 1 && result.chart.y_keys.every(k => isRateColumn(k))) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {result.chart.y_keys.map((key, i) => (
            <ResultChart
              key={key}
              chart={{ ...result.chart, y_keys: [key], title: key }}
              data={result.data}
              colorIndex={i}
              compact
            />
          ))}
        </div>
      );
    }

    // All amount columns or single key — single grouped chart
    return <ResultChart chart={result.chart} data={result.data} />;
  };

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

      {renderCharts()}
      <ResultTable columns={result.columns} data={result.data} />
    </div>
  );
}
