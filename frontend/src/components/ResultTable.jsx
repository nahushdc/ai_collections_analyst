import React from 'react';
import { formatNumber, isRateColumn, isAmountColumn } from '../utils/formatters';

export default function ResultTable({ columns, data }) {
  if (!data || data.length === 0) return null;

  const formatCell = (value, colName) => {
    if (value == null) return '-';
    if (typeof value === 'number') {
      if (isRateColumn(colName)) return `${value.toFixed(2)}%`;
      return formatNumber(value);
    }
    return String(value);
  };

  const isGrandTotal = (row) => {
    const firstVal = String(row[columns[0]] || '');
    return firstVal === 'Grand Total';
  };

  const getCellClass = (colName) => {
    if (isRateColumn(colName)) return 'text-emerald-400';
    if (isAmountColumn(colName)) return 'text-cyan-300';
    return 'text-slate-200';
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/80">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const grandTotal = isGrandTotal(row);
            return (
              <tr
                key={idx}
                className={
                  grandTotal
                    ? 'bg-gradient-to-r from-violet-600/20 to-cyan-600/20 font-bold border-t border-slate-600/50'
                    : idx % 2 === 0
                      ? 'bg-slate-800/20'
                      : ''
                }
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className={`px-4 py-3 whitespace-nowrap ${grandTotal ? 'text-slate-100 font-semibold' : getCellClass(col)}`}
                  >
                    {formatCell(row[col], col)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
