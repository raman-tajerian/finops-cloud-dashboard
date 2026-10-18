// Lazy-loaded print-friendly view; the user saves it as PDF from the browser print dialog.
import type { ReportDto } from "@/types/finops";

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function openPrintView(r: ReportDto) {
  const w = window.open("", "_blank");
  if (!w) return;
  const totals = Object.entries(r.totals).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const sections = r.sections.map((s) => `<h2>${esc(s.title)}</h2><table><thead><tr>${s.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${s.rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("");
  w.document.write(`<!doctype html><html><head><title>${esc(r.title)} — Fjord Labs</title><style>body{font-family:system-ui,sans-serif;margin:32px;color:#1F2421}h1{font-weight:500}table{border-collapse:collapse;width:100%;margin:8px 0 24px;font-size:12px}th,td{border-bottom:1px solid #E7E1D8;padding:6px;text-align:left}p{color:#666;font-size:12px}</style></head><body><h1>${esc(r.title)}</h1><p>Fjord Labs · range ${esc(r.range)} · demo data as of ${esc(r.generatedAt)}</p><table>${totals}</table>${sections}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
