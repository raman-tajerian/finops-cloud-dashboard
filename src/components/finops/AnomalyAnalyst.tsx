import { useRef, useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { fmtUSD } from "@/lib/finops-data";
import { useDashboardData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Lets FinOps members pick an anomaly and get AI-suggested causes and prioritized actions. */
export function AnomalyAnalyst() {
  const list = useDashboardData().kpis.anomalies;
  const [picked, setId] = useState("");
  const id = list.some((a) => a.id === picked) ? picked : list[0]?.id ?? "";
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const run = async () => {
    setText(""); setError(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const res = await fetch("/api/anomaly-analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anomalyId: id, note }), signal: ac.signal });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "The analysis failed."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        acc += dec.decode(value, { stream: true });
        const i = acc.indexOf("[[ERROR]]");
        if (i >= 0) { setText(acc.slice(0, i).trim()); setError(acc.slice(i + 9)); } else setText(acc);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally { setBusy(false); ctrl.current = null; }
  };

  return (
    <article className="organic-card h-full p-6">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] text-muted-foreground">AI anomaly analyst</p><p className="mt-1 text-sm text-muted-foreground">Pick an anomaly — AI reviews cost and resource data for likely causes and next actions.</p></div>
        <Sparkles className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {list.map((a) => (
          <button key={a.id} onClick={() => setId(a.id)} disabled={busy} className={`rounded-xl border p-3 text-left transition-colors ${id === a.id ? "border-foreground/40 bg-secondary" : "border-border hover:bg-secondary/50"}`}>
            <p className="text-sm font-medium">{a.title}</p>
            <p className="metric-numbers mt-1 text-xs text-muted-foreground"><span className="text-destructive">+{a.change}%</span> · {fmtUSD(a.impact)} · {a.since}</p>
          </button>
        ))}
      </div>
      <Textarea className="mt-3" rows={2} maxLength={500} placeholder="Optional context, e.g. 'new CDN rollout on Oct 1'" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
      <div className="mt-3 flex gap-2">
        {list.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No active anomalies for the selected providers.</p>}
        <Button onClick={run} disabled={busy || !id}><Sparkles />{busy ? "Analyzing…" : "Analyze anomaly"}</Button>
        {busy && <Button variant="secondary" onClick={() => ctrl.current?.abort()}><Square />Stop</Button>}
      </div>
      {(text || error || busy) && (
        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          {busy && !text && <p className="animate-pulse text-sm text-muted-foreground">Reading cost and resource data…</p>}
          {text && <div className="whitespace-pre-wrap text-sm leading-relaxed">{text.replace(/^## /gm, "").replace(/\*\*/g, "")}</div>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </article>
  );
}
