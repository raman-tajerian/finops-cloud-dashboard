import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPE } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Area, ComposedChart, CartesianGrid, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Leaf, Move3d, TrendingUp } from "lucide-react";
import { fmtUSD } from "@/lib/finops-data";
import { carbonRegions, forecast, simulateSavings, topoEdges, topoNodes, type TopoNode } from "@/lib/finops-insights-data";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{children}</p>;
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };

/** Animated number counter that re-tweens whenever value changes. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <>{format(shown)}</>;
}

/** Subtle 3D tilt wrapper for bento cards. */
export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 200, damping: 20 });
  const move = (e: RPE<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }} onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }}
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full ${className}`}>
      {children}
    </motion.div>
  );
}

/* ---------- 3D topology (CSS-projected SVG graph, drag to rotate) ---------- */
const healthColor = { ok: "var(--chart-2)", oversized: "var(--warning)", anomaly: "var(--destructive)" } as const;
export function Topology3D() {
  const [yaw, setYaw] = useState(0.5);
  const [pitch, setPitch] = useState(-0.25);
  const [hover, setHover] = useState<TopoNode | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const tick = () => { if (!drag.current) setYaw((y) => y + 0.0025); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  const project = (n: { x: number; y: number; z: number }) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = n.x * cy - n.z * sy, z1 = n.x * sy + n.z * cy;
    const y1 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp;
    const s = 420 / (420 + z2);
    return { x: 300 + x1 * s, y: 190 + y1 * s, s, z: z2 };
  };
  const pts = Object.fromEntries(topoNodes.map((n) => [n.id, project(n)]));
  const sorted = [...topoNodes].sort((a, b) => pts[b.id]!.z - pts[a.id]!.z);
  return (
    <article className="organic-card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div><Label>Cloud topology</Label><p className="mt-1 text-sm text-muted-foreground">Regions, VPCs and clusters · drag to rotate</p></div>
        <Move3d className="size-4 text-muted-foreground" />
      </div>
      <div className="relative mt-4 flex-1 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drag.current) return; setYaw((y) => y + (e.clientX - drag.current!.x) * 0.008); setPitch((p) => Math.max(-1.2, Math.min(1.2, p + (e.clientY - drag.current!.y) * 0.006))); drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={() => { drag.current = null; }}>
        <svg viewBox="0 0 600 380" className="h-full min-h-[300px] w-full">
          {topoEdges.map((e) => { const a = pts[e.from]!, b = pts[e.to]!; return <line key={e.from + e.to} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={1.2} />; })}
          {sorted.map((n) => {
            const p = pts[n.id]!; const r = (n.kind === "region" ? 14 : n.kind === "vpc" ? 9 : 7) * p.s; const c = healthColor[n.health];
            return (
              <g key={n.id} onPointerEnter={() => setHover(n)} onPointerLeave={() => setHover(null)} style={{ opacity: 0.55 + 0.45 * Math.min(1, p.s) }}>
                {n.health !== "ok" && <circle cx={p.x} cy={p.y} r={r} fill={c} className="topo-pulse" />}
                <circle cx={p.x} cy={p.y} r={r} fill="var(--card)" stroke={c} strokeWidth={n.kind === "region" ? 2 : 1.5} />
                <circle cx={p.x} cy={p.y} r={r * 0.35} fill={c} />
                <text x={p.x} y={p.y + r + 13} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={10}>{n.label}</text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-border bg-popover px-3 py-2 text-xs animate-in fade-in">
            <p className="font-medium">{hover.label} <span className="text-muted-foreground">· {hover.kind}</span></p>
            <p className="metric-numbers mt-0.5">{fmtUSD(hover.cost)}/mo · {hover.health === "ok" ? "healthy" : hover.health}</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        {(["ok", "oversized", "anomaly"] as const).map((h) => <span key={h} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: healthColor[h] }} />{h === "ok" ? "Healthy" : h === "oversized" ? "Oversized" : "Anomaly"}</span>)}
      </div>
    </article>
  );
}

/* ---------- GreenOps ---------- */
const ratingTone = { A: "bg-success-soft text-success", B: "bg-success-soft text-success", C: "bg-warning-soft text-warning", D: "bg-destructive-soft text-destructive" } as const;
export function GreenOps({ scale }: { scale: number }) {
  const tons = carbonRegions.reduce((a, b) => a + b.tons, 0) * scale;
  const avg = carbonRegions.reduce((a, b) => a + b.intensity * b.tons, 0) / carbonRegions.reduce((a, b) => a + b.tons, 0);
  const max = Math.max(...carbonRegions.map((r) => r.intensity));
  return (
    <article className="organic-card h-full p-6">
      <div className="flex items-start justify-between"><Label>Carbon footprint · GreenOps</Label><Leaf className="size-4 text-success" /></div>
      <div className="mt-3 flex items-end gap-6">
        <div><p className="metric-numbers text-3xl"><CountUp value={tons} format={(n) => n.toFixed(1)} /> t</p><p className="text-[11px] text-muted-foreground">CO₂e this month</p></div>
        <div><p className="metric-numbers text-xl">{Math.round(avg)}</p><p className="text-[11px] text-muted-foreground">avg gCO₂/kWh</p></div>
      </div>
      <ul className="mt-5 space-y-3">
        {carbonRegions.map((r, i) => (
          <li key={r.region}>
            <div className="flex items-center justify-between text-xs"><span><span className="font-mono">{r.region}</span> <span className="text-muted-foreground">· {r.provider}</span></span>
              <span className="flex items-center gap-2"><span className="metric-numbers text-muted-foreground">{r.intensity} g</span><span className={`rounded-full px-1.5 text-[10px] font-semibold ${ratingTone[r.rating]}`}>{r.rating}</span></span></div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full" style={{ background: r.rating <= "B" ? "var(--success)" : r.rating === "C" ? "var(--warning)" : "var(--destructive)" }}
                initial={{ width: 0 }} whileInView={{ width: `${(r.intensity / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ---------- Anomaly forecast with prediction band ---------- */
export function AnomalyForecast({ scale }: { scale: number }) {
  const data = forecast.map((d) => ({ ...d, forecast: d.forecast * scale, band: [d.band[0] * scale, d.band[1] * scale], actual: d.actual === null ? null : d.actual * scale }));
  const spike = data[18]!;
  return (
    <article className="organic-card h-full p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Anomaly detection · spend forecast</Label><p className="mt-1 text-sm text-muted-foreground">Daily spend vs. 90% confidence band</p></div>
        <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 py-1 text-[11px] font-medium text-destructive">
          <span className="size-1.5 animate-pulse rounded-full bg-destructive" /><TrendingUp className="size-3" />+240% spike in Azure Blob Storage Egress
        </motion.span>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tip} formatter={(v) => Array.isArray(v) ? `${fmtUSD(Number(v[0]))} – ${fmtUSD(Number(v[1]))}` : fmtUSD(Number(v))} />
            <Area dataKey="band" name="Confidence" stroke="none" fill="var(--chart-1)" fillOpacity={0.14} animationDuration={900} />
            <Line dataKey="forecast" name="Forecast" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} strokeWidth={1.2} animationDuration={900} />
            <Line dataKey="actual" name="Actual" stroke="var(--chart-2)" dot={false} strokeWidth={2} connectNulls={false} animationDuration={1100} />
            <ReferenceDot x={spike.day} y={spike.actual ?? 0} r={5} fill="var(--destructive)" stroke="var(--card)" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

/* ---------- What-if simulator ---------- */
export function WhatIfSimulator() {
  const [ri, setRi] = useState(40), [mig, setMig] = useState(20), [rs, setRs] = useState(10);
  const r = simulateSavings(ri, mig, rs);
  const rows: [string, number, (v: number) => void, number][] = [["Shift workload to Reserved Instances", ri, setRi, r.ri], ["Migrate US-East → EU-North", mig, setMig, r.migrate], ["Rightsize oversized compute", rs, setRs, r.rightsize]];
  const body = (
    <div className="space-y-6">
      {rows.map(([label, v, set, save]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-sm"><span>{label}</span><span className="metric-numbers text-muted-foreground">{v}% · <span className="text-success">−{fmtUSD(save)}</span></span></div>
          <Slider className="mt-3" value={[v]} max={100} step={5} onValueChange={([n]) => set(n ?? 0)} aria-label={label} />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div><Label>Projected savings</Label><p className="metric-numbers mt-1 text-2xl text-success"><CountUp value={r.total} format={(n) => fmtUSD(n)} />/mo</p></div>
        <div><Label>New monthly run-rate</Label><p className="metric-numbers mt-1 text-2xl"><CountUp value={r.projected} format={(n) => fmtUSD(n)} /></p></div>
      </div>
    </div>
  );
  return (
    <article className="organic-card h-full p-6">
      <div className="flex items-start justify-between gap-3">
        <div><Label>What-if scenario simulator</Label><p className="mt-1 text-sm text-muted-foreground">Model commitments and migrations in real time</p></div>
        <Dialog>
          <DialogTrigger asChild><Button size="sm" variant="secondary"><Calculator />Expand</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>What-if scenario simulator</DialogTitle><DialogDescription>Based on current $248,730 monthly spend.</DialogDescription></DialogHeader>{body}</DialogContent>
        </Dialog>
      </div>
      <div className="mt-5">{body}</div>
    </article>
  );
}
