// Shared page sub-tabs: one tab bar for every page. The active tab lives in the
// URL as ?tab=<id> (root search schema), so it survives reloads and is shareable,
// and function-form search updates keep the global filters and currency intact.
import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { MOTION } from "@/lib/motion";

export interface PageTab { id: string; label: string }

/** Tab registry: single source for the tab bars, deep links and the command palette. */
export const PAGE_TABS = {
  '/model-insights': { label: 'Model Insights', tabs: [{ id: 'detection', label: 'Detection' }, { id: 'forecast', label: 'Forecast' }, { id: 'models', label: 'Models' }, { id: 'pipeline', label: 'Pipeline' }] },
  "/commitments": { label: "Commitments", tabs: [{ id: "coverage", label: "Coverage" }, { id: "commitments", label: "Commitments" }, { id: "recommendations", label: "Recommendations" }] },
  "/teams": { label: "Teams", tabs: [{ id: "overview", label: "Overview" }, { id: "resources", label: "Resources" }, { id: "budgets", label: "Budgets" }] },
  "/notifications": { label: "Notifications", tabs: [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "read", label: "Read" }] },
  "/": { label: "Overview", tabs: [
    { id: "summary", label: "Summary" },
    { id: "unit-economics", label: "Unit economics" },
    { id: "infrastructure", label: "Infrastructure" },
    { id: "carbon", label: "Carbon" },
  ] },
  "/cost-explorer": { label: "Cost Explorer", tabs: [
    { id: "explore", label: "Explore" },
    { id: "compare", label: "Compare periods" },
    { id: "unit-economics", label: "Unit economics" },
    { id: "saved-views", label: "Saved views" },
  ] },
  "/resources": { label: "Resources", tabs: [
    { id: "list", label: "List" },
    { id: "map", label: "Map" },
    { id: "idle", label: "Idle and waste" },
  ] },
  "/recommendations": { label: "Recommendations", tabs: [
    { id: "open", label: "Open" },
    { id: "in-progress", label: "In progress" },
    { id: "done", label: "Done and ignored" },
    { id: "tracker", label: "Savings tracker" },
  ] },
  "/kubernetes": { label: "Kubernetes", tabs: [
    { id: "clusters", label: "Clusters" },
    { id: "namespaces", label: "Namespaces" },
    { id: "pods", label: "Pods" },
    { id: "live", label: "Live activity" },
  ] },
  "/budgets": { label: "Budgets & Alerts", tabs: [
    { id: "budgets", label: "Budgets" },
    { id: "alerts", label: "Alert rules" },
    { id: "anomalies", label: "Anomalies" },
    { id: "forecast", label: "Forecast and simulator" },
  ] },
  "/sustainability": { label: "Sustainability", tabs: [
    { id: "overview", label: "Overview" },
    { id: "regions", label: "Regions" },
    { id: "greener", label: "Greener regions" },
    { id: "how", label: "How it is calculated" },
  ] },
  "/security": { label: "Security & Compliance", tabs: [
    { id: "score", label: "Score" },
    { id: "findings", label: "Findings" },
    { id: "compliance", label: "Compliance" },
  ] },
  "/reports": { label: "Reports", tabs: [
    { id: "generate", label: "Generate" },
    { id: "templates", label: "Templates" },
    { id: "history", label: "History" },
    { id: "schedules", label: "Schedules" },
  ] },
  "/integrations": { label: "Integrations", tabs: [
    { id: "connected", label: "Connected" },
    { id: "available", label: "Available" },
    { id: "sync-history", label: "Sync history" },
  ] },
  "/settings": { label: "Settings", tabs: [
    { id: "profile", label: "Profile" },
    { id: "workspace", label: "Workspace" },
    { id: "members", label: "Team members" },
    { id: "allocation", label: "Cost allocation" },
    { id: "notifications", label: "Notifications" },
    { id: "keys", label: "API keys" },
    { id: "appearance", label: "Appearance" },
  ] },
} satisfies Record<string, { label: string; tabs: PageTab[] }>;

/** Resolves a raw ?tab= value to a valid tab id; invalid or missing falls back to the first tab. */
export function resolveTab(tabs: PageTab[], raw: string | undefined): string {
  return tabs.some((t) => t.id === raw) ? raw! : tabs[0]!.id;
}

/** URL-backed tab state for a page. Writes merge into the current search, keeping filters and currency. */
export function usePageTab(tabs: PageTab[]) {
  const raw = useSearch({ strict: false }) as { tab?: string };
  const navigate = useNavigate();
  const tab = resolveTab(tabs, raw.tab);
  const setTab = (id: string) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, tab: id }), replace: true, resetScroll: false } as never);
  return { tab, setTab };
}

/** Horizontally scrollable tab bar with a sliding pill, full keyboard support and aria semantics. */
export function PageTabs({ tabs, value, onChange, ariaLabel }: { tabs: PageTab[]; value: string; onChange: (id: string) => void; ariaLabel: string }) {
  const layoutId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const active = resolveTab(tabs, value);

  useEffect(() => {
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] :
      e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] :
      e.key === "Home" ? tabs[0] :
      e.key === "End" ? tabs[tabs.length - 1] : undefined;
    if (next) {
      e.preventDefault();
      onChange(next.id);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    }
  };

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}
      className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button key={t.id} data-tab={t.id} role="tab" id={`tab-${t.id}`} aria-selected={selected} aria-controls={`tabpanel-${t.id}`}
            tabIndex={selected ? 0 : -1} onClick={() => onChange(t.id)}
            className={`relative min-h-10 shrink-0 rounded-full px-4 text-sm transition-colors ${selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {selected && (
              <motion.span layoutId={layoutId} aria-hidden
                className="absolute inset-0 rounded-full border border-border bg-card shadow-sm"
                transition={{ type: "spring", ...MOTION.spring }} />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Tab panel: crossfades with a 6px rise when the active tab changes. */
export function TabContent({ tab, children }: { tab: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>{children}</div>;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={tab} role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: MOTION.duration.fast } }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.ease }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
