import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartReveal } from "@/components/motion";
import { DataTableView, TableToggle } from "./States";
import { useMoney } from "@/lib/money";
import type { DailyCost } from "@/types/finops";

export function SpendTrend({ points, label }: { points: DailyCost[]; label: string }) {
  const [table, setTable] = useState(false);
  const { fmt } = useMoney();
  return <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{label}</h3><TableToggle on={table} onChange={setTable} /></div><div className="mt-3 h-40">{table ? <DataTableView caption={label} columns={["Day", "Spend"]} rows={points.map((p) => [p.day, fmt(p.spend)])} /> : <ChartReveal><ResponsiveContainer width="100%" height={160}><AreaChart data={points}><XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} minTickGap={40} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)", borderRadius: 8 }} /><Area type="monotone" dataKey="spend" stroke="var(--sage)" fill="var(--sage)" fillOpacity={0.12} strokeWidth={2} strokeLinecap="round" isAnimationActive={false} /></AreaChart></ResponsiveContainer></ChartReveal>}</div></div>;
}