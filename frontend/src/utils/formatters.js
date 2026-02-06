export function formatNumber(value) {
  if (value == null) return '-';
  if (typeof value !== 'number') return String(value);
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatCurrency(value) {
  if (value == null) return '-';
  if (typeof value !== 'number') return String(value);
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatPercent(value) {
  if (value == null) return '-';
  if (typeof value !== 'number') return String(value);
  return `${value.toFixed(2)}%`;
}

export function isRateColumn(colName) {
  const lower = colName.toLowerCase();
  return lower.includes('rate') || lower.includes('conversion') || lower.includes('%');
}

export function isAmountColumn(colName) {
  const lower = colName.toLowerCase();
  return (
    lower.includes('collection') ||
    lower.includes('amount') ||
    lower.includes('aum') ||
    lower.includes('pos') ||
    lower.includes('mtd')
  );
}
