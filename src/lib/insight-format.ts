import type { DailyInsightDto } from "@/types/finops";
import { fmtMoney } from "@/lib/money";

export function formatInsightFigure(figure: DailyInsightDto["figure"]): string {
  if (figure.unit === "USD") return fmtMoney(figure.value);
  if (figure.unit === "tCO2e") return `${figure.value.toFixed(2)} t CO₂e`;
  return `${figure.value}`;
}
export function formatInsightSentence(insight: DailyInsightDto): string {
  return insight.sentence.replace("{figure}", formatInsightFigure(insight.figure));
}