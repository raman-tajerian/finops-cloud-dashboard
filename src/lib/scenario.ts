// Pure what-if math over a ScenarioDto. Sliders are 0-100 (% of eligible spend affected).
import type { ScenarioDto } from "@/types/finops";

export interface Levers { ri: number; migrate: number; rightsize: number }
export function simulate(d: ScenarioDto, l: Levers) {
  const ri = d.computeSpend * (l.ri / 100) * d.riDiscount;
  const moved = d.migrateSpend * (l.migrate / 100);
  const migrate = moved * (1 - d.costRatio); // negative when the target region is pricier
  const rightsize = d.rightsizeEligible * (l.rightsize / 100);
  const savings = ri + migrate + rightsize;
  const projected = d.baseline - savings;
  const co2Reduction = (moved * d.kwhPerUsd * (d.intensityFrom - d.intensityTo * d.costRatio)) / 1e6; // t CO2e
  return { ri, migrate, rightsize, savings, projected, pct: d.baseline ? (savings / d.baseline) * 100 : 0, co2Reduction };
}
