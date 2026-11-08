import type { DashboardDto, SecurityDto } from "@/types/finops";
import type { FindingState, RecState } from "./session-store";
import { navItems } from "./nav";
import { PAGE_TABS } from "@/components/finops/PageTabs";

export function navigationCounts(d: DashboardDto | undefined, security: SecurityDto | undefined, recs: Record<string, RecState> = {}, findings: Record<string, FindingState> = {}) {
  return {
    "/recommendations": d?.recommendations.filter((r) => (recs[r.id]?.status ?? "Open") === "Open").length,
    "/security": security?.findings.filter((f) => ["Open", "In progress"].includes(findings[f.id]?.status ?? f.status)).length,
    "/budgets": d?.overview.anomalies.value,
  } as Record<string, number | undefined>;
}

/** Ranked, case-insensitive substring/subsequence matching plus single typo tolerance. */
export function fuzzyMatch(value: string, query: string): number {
  const hay = value.toLowerCase();
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  let score = 1;
  for (const word of words) {
    if (hay.includes(word)) continue;
    const subsequence = hay.split(/\s+/).some((token) => {
      if (token.length > word.length * 3) return false;
      let i = 0;
      for (const c of token) if (c === word[i]) i++;
      return i === word.length;
    });
    if (subsequence) { score *= 0.6; continue; }
    const typo = hay.split(/[^a-z0-9-]+/).some((token) => {
      if (Math.abs(token.length - word.length) > 1 || word.length < 3) return false;
      const dp = Array.from({ length: word.length + 1 }, (_, j) => j);
      for (let a = 1; a <= token.length; a++) {
        let diagonal = dp[0] ?? 0; dp[0] = a;
        for (let b = 1; b <= word.length; b++) {
          const old = dp[b] ?? b;
          dp[b] = Math.min(old + 1, (dp[b - 1] ?? 0) + 1, diagonal + (token[a - 1] === word[b - 1] ? 0 : 1)); diagonal = old;
        }
      }
      return (dp[word.length] ?? 2) <= 1;
    });
    if (!typo) return 0;
    score *= 0.4;
  }
  return score;
}
export interface SearchTarget { group: string; label: string; to: string; tab?: string; search?: Record<string, unknown>; keywords?: string }
export function searchTargets(d?: DashboardDto, security?: SecurityDto): SearchTarget[] {
  return [
    ...navItems.map((p) => ({ group: "Pages", label: p.label, to: p.to, keywords: p.description })),
    ...Object.entries(PAGE_TABS).flatMap(([to, p]) => p.tabs.map((t) => ({ group: to === "/settings" ? "Settings" : "Tabs", label: `${p.label} › ${t.label}`, to, tab: t.id }))),
    ...(d?.resources ?? []).map((r) => ({ group: "Resources", label: r.name, to: "/resources", tab: "list", search: { id: r.id }, keywords: `${r.type} ${r.provider} ${r.region}` })),
    ...(d?.recommendations ?? []).map((r) => ({ group: "Recommendations", label: r.title, to: "/recommendations", tab: "open", search: { q: r.title }, keywords: `${r.detail} ${r.team}` })),
    ...(security?.findings ?? []).map((f) => ({ group: "Findings", label: f.title, to: "/security", tab: "findings", search: { finding: f.id }, keywords: `${f.provider} ${f.severity} ${f.resourceId ?? "account"}` })),
  ];
}