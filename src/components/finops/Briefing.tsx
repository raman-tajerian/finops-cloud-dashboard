import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Leaf, ShieldAlert, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/motion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CardSkeleton, ErrorState } from "@/components/finops/States";
import { useFernScore, useInsights } from "@/lib/queries";
import { useCurrency } from "@/lib/money";
import { formatInsightFigure, formatInsightSentence } from "@/lib/insight-format";
import type { FernScoreDto, InsightLink, InsightType } from "@/types/finops";

const factors: { key: keyof FernScoreDto["subScores"]; label: string; weight: number; rule: string; link: InsightLink }[] = [
  { key: "waste", label: "Waste", weight: 35, rule: "100 − (idle waste ÷ selected spend) × 500; 20% waste gives zero.", link: { to: "/resources", tab: "idle" } },
  { key: "security", label: "Security", weight: 25, rule: "The existing weighted security score.", link: { to: "/security", tab: "score" } },
  { key: "budget", label: "Budget", weight: 20, rule: "100 at or below 90% of the company monthly budget; falls linearly to zero at 130%, using the end-of-month forecast.", link: { to: "/budgets", tab: "budgets" } },
  { key: "anomaly", label: "Anomalies", weight: 20, rule: "100 − 25 per active anomaly, minimum zero.", link: { to: "/budgets", tab: "anomalies" } },
];
const icons = { "cost-mover": TrendingUp, saving: Sparkles, budget: Wallet, security: ShieldAlert, "greener-region": Leaf } satisfies Record<InsightType, typeof Leaf>;

export function FernScoreCard() {
  const q = useFernScore();
  const [open, setOpen] = useState(false);
  if (q.isPending) return <CardSkeleton h="h-40" />;
  if (q.isError) return <ErrorState message="We couldn't load your Fern score." onRetry={() => q.refetch()} />;
  const d = q.data;
  return <section className="organic-card h-full p-7" aria-label="Fern score">
    <h2 className="text-base font-semibold">Fern score</h2>
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="mt-5 flex flex-col items-center gap-4">
        {d.score === null ? <p className="text-5xl" aria-label="Fern score unavailable">—</p> : <SheetTrigger asChild><Button variant="ghost" aria-label="What affects your score" className="h-auto rounded-full p-2"><ProgressRing value={d.score} size={132} stroke={7} suffix="" label="Fern score" /></Button></SheetTrigger>}
        <p className="text-center text-sm text-muted-foreground">{d.score === null ? "No matching resources to assess." : "Waste, security, budget and anomalies."}</p>
      </div>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader><SheetTitle>What affects your score</SheetTitle><SheetDescription>Fern score = round(0.35 × waste + 0.25 × security + 0.20 × budget + 0.20 × anomaly). Each score is clamped to 0–100.</SheetDescription></SheetHeader>
        <div className="mt-7 space-y-7">{factors.map((factor) => <div key={factor.key} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3"><h3 className="font-medium">{factor.label} <span className="text-xs text-muted-foreground">{factor.weight}% weight</span></h3><span className="metric-numbers">{d.subScores[factor.key]?.toFixed(1) ?? "—"} / 100</span></div>
          <p className="text-sm leading-6 text-muted-foreground">{factor.rule}</p>
          <Button asChild variant="link" className="h-10 px-0"><Link to={factor.link.to} search={(prev) => ({ ...prev, tab: factor.link.tab })} onClick={() => setOpen(false)}>Improve {factor.label.toLowerCase()}<ArrowUpRight /></Link></Button>
        </div>)}</div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">Based on the filtered aggregates and default company budget; session-only demo actions do not change this assessment. Idle waste is monthly; spend uses the selected period.</p>
      </SheetContent>
    </Sheet>
  </section>;
}

export function DailyBriefingCard() {
  const q = useInsights();
  useCurrency();
  if (q.isPending) return <CardSkeleton h="h-64" />;
  if (q.isError) return <ErrorState message="We couldn't load your daily briefing." onRetry={() => q.refetch()} />;
  return <section className="organic-card h-full p-7" aria-label="Daily briefing">
    <h2 className="text-base font-semibold">Daily briefing</h2>
    {q.data.insights.length === 0 ? <div className="mt-7 flex items-center gap-3 text-sm text-muted-foreground"><Leaf className="size-5 shrink-0" strokeWidth={1.5} />Nothing needs attention</div> : <ul className="mt-4 divide-y divide-border/40">{q.data.insights.map((insight) => {
      const Icon = icons[insight.type];
      return <li key={insight.id} className="flex items-start gap-3 py-4">
        <Icon aria-hidden className="mt-1 size-5 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="min-w-0 flex-1"><p className="text-sm leading-6">{formatInsightSentence(insight)}</p><p className="metric-numbers mt-1 text-sm font-semibold">{formatInsightFigure(insight.figure)}</p></div>
        <Button asChild size="icon" variant="ghost" className="size-10 shrink-0"><Link to={insight.link.to} search={(prev) => ({ ...prev, tab: insight.link.tab })} aria-label={`View ${insight.type.replaceAll("-", " ")}`}><ArrowUpRight /></Link></Button>
      </li>;
    })}</ul>}
  </section>;
}