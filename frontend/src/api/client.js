const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function queryBackend(question) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchRegions() {
  const res = await fetch(`${API_BASE}/api/regions`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchBuckets() {
  const res = await fetch(`${API_BASE}/api/buckets`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function exportToExcel(data, columns) {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, columns }),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Two-step preview/confirm flow (new endpoints from AI-data)
// ---------------------------------------------------------------------------

export async function queryPreview(question) {
  const res = await fetch(`${API_BASE}/api/query/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function queryConfirm(question, confirmedLogic, previewData) {
  const res = await fetch(`${API_BASE}/api/query/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      confirmed_logic: confirmedLogic,
      preview_data: previewData,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function modifyLogic(currentLogic, followup) {
  const res = await fetch(`${API_BASE}/api/query/modify-logic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_logic: currentLogic,
      followup,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
