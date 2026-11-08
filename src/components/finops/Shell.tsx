import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccentBand, BrandIntro, FjordAvatar, FjordLogo } from "@/components/brand";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Pin, ChevronDown, HelpCircle, Bell, ChevronsLeft, ChevronsUpDown, LogOut, Menu, Radar, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { navGroups, navItems } from "@/lib/nav";
import { dataSource } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationPalette } from "./NavigationPalette";
import { HelpDrawer, CalculationNotes } from "./Help";
import { navigationCounts } from "@/lib/findability";

import { CreateBudgetDialog } from "./BudgetsAlerts";
import { PAGE_TABS } from "@/components/finops/PageTabs";
import { useDashboard, useSecurity, useAlerts } from "@/lib/queries";
import { CURRENCIES, CurrencySync, useCurrency, useSetCurrency } from "@/lib/money";
import { useTableDensity } from "@/lib/density";
import { recordVisit, setSession, targetKey, togglePin, useSession, type NavTarget } from "@/lib/session-store";
import { useGlobalShortcuts } from "@/lib/shortcuts";

import { CardSkeleton, FilterEmptyState } from "./States";

const seedNotes = [
  { id: 1, kind: "Anomaly", text: "+140% Azure Blob Storage egress", time: "2h ago" },
  { id: 2, kind: "Budget", text: "Q4 budget passed 80% threshold", time: "5h ago" },
  { id: 3, kind: "Remediation", text: "Auto-scaler removed 3 idle nodes", time: "1d ago" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const overlayTrigger = useRef<HTMLElement | null>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const returnFocus = () => { const el = overlayTrigger.current; if (el?.isConnected) el.focus(); else { const search = Array.from(document.querySelectorAll<HTMLButtonElement>('header button')).find((b) => b.offsetWidth > 0 && (b.getAttribute('aria-label') === 'Search' || b.textContent?.includes('Search'))); (search ?? searchButton.current)?.focus(); } };
  const captureFocus = () => { overlayTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; };
  const showPalette = () => { captureFocus(); setPalette(true); };
  const showHelp = () => { captureFocus(); setHelp(true); };
  const [backTarget, setBackTarget] = useState<{ href: string; label: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [unread, setUnread] = useState<number[]>(seedNotes.map((n) => n.id));
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const previousLocation = useRef(location);
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const resources = dashboard.data?.resources ?? [];
  const filteredPage = path !== "/settings" && path !== "/integrations";
  const current = navItems.find((i) => i.to === path) ?? { label: "Overview", to: "/", icon: Radar };
  const security = useSecurity();
  const alerts = useAlerts();
  const navigation = useSession((s) => s.navigation);
  const recs = useSession((s) => s.recs);
  const findings = useSession((s) => s.findings);
  const counts = navigationCounts(dashboard.isPlaceholderData ? undefined : dashboard.data, security.isPlaceholderData ? undefined : security.data, recs, findings);
  const page = PAGE_TABS[path as keyof typeof PAGE_TABS];
  const rawTab = (location.search as { tab?: string }).tab;
  const activeTab = page?.tabs.find((t) => t.id === rawTab) ?? page?.tabs[0];
  const pageTarget: NavTarget = { to: path, label: current.label };
  const tabTarget: NavTarget = { to: path, tab: activeTab?.id ?? "", label: `${current.label} › ${activeTab?.label ?? ""}` };
  const pin = (target: NavTarget) => setSession((s) => ({ ...s, navigation: togglePin(s.navigation, target) }));
  const targetLink = (target: NavTarget) => <Link to={target.to} search={(p) => ({ range: p.range, providers: p.providers, env: p.env, team: p.team, cur: p.cur, tab: target.tab ?? "" })} onClick={() => setOpen(false)} className="flex min-h-10 min-w-0 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary"><span className="truncate">{target.label}</span></Link>;
  const currency = useCurrency();
  const setCurrency = useSetCurrency();
  const { density } = useTableDensity();
  const reduceMotion = useSession((s) => s.settings.reduceMotion);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!palette) captureFocus(); setPalette((p) => !p); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    setSession((s) => ({ ...s, navigation: recordVisit(s.navigation, { to: path, label: current.label }) }));
  }, [path, current.label]);
  useEffect(() => {
    const previous = previousLocation.current;
    if (previous.pathname !== path) {
      const inContent = document.activeElement?.closest("main");
      const drilldown = !!inContent || !!(location.state as { drilldown?: boolean }).drilldown;
      setBackTarget(drilldown ? { href: previous.href, label: navItems.find((n) => n.to === previous.pathname)?.label ?? "previous page" } : null);
    }
    previousLocation.current = location;
  }, [location, path]);

  const scan = () => { setScanning(true); window.setTimeout(() => { setScanning(false); toast.success("Scan complete — 1,872 resources checked"); }, 1600); };
  useGlobalShortcuts({
    navigate: (to) => { setPalette(false); setHelp(false); navigate({ to }); },
    openPalette: showPalette,
    openHelp: showHelp,
    closeOverlays: () => { setPalette(false); setHelp(false); setOpen(false); },
  });

  return (
    <div data-density={density} data-reduce-motion={reduceMotion} className={`min-h-screen bg-background lg:grid ${collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[248px_minmax(0,1fr)]"}`}>
      <CurrencySync />
      <BrandIntro />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-sidebar-bg px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : ""} ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-11 w-full min-w-0 items-center gap-3 rounded-xl px-2 pr-12 text-left hover:bg-secondary lg:pr-2">
              <FjordAvatar size={32} />
              {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold tracking-[0.02em]">Fjord <span className="font-normal text-muted-foreground">Labs</span></span><span className="block truncate text-xs text-muted-foreground">Production</span></span>}
              {!collapsed && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {["Fjord Labs – Production", "Fjord Labs – Staging", "Fjord Labs – Sandbox"].map((w) => <DropdownMenuItem key={w} onSelect={() => toast(`Switched to ${w} (demo)`)}>{w}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="absolute right-2 top-4 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button>

        <nav className="mt-4 flex-1 space-y-4 overflow-y-auto" aria-label="Main">
          {!collapsed && ["Pinned", "Recent"].map((label) => { const targets = label === "Pinned" ? navigation.pinned : navigation.recent; return <section key={label} aria-label={label}><p className="px-3 pb-1 text-[11px] font-medium uppercase text-muted-foreground">{label}</p>{targets.map((target) => <div key={targetKey(target)} className="flex min-w-0 items-center"><div className="min-w-0 flex-1">{targetLink(target)}</div>{label === "Pinned" && <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`Unpin ${target.label}`} onClick={() => pin(target)}><Pin className="size-3 text-primary" /></Button>}</div>)}{!targets.length && <Button variant="ghost" size="sm" className="h-10 w-full justify-start text-xs text-muted-foreground" onClick={() => pin(pageTarget)}>Pin current page</Button>}</section>; })}
          {navGroups.map((g) => (
            <div key={g.label}>
              {!collapsed && <Button variant="ghost" className="h-10 w-full justify-between px-3 text-[11px] font-medium uppercase text-muted-foreground" aria-expanded={!navigation.collapsed[g.label]} onClick={() => setSession((s) => ({ ...s, navigation: { ...s.navigation, collapsed: { ...s.navigation.collapsed, [g.label]: !s.navigation.collapsed[g.label] } } }))}>{g.label}<ChevronDown className={`size-3 ${navigation.collapsed[g.label] ? "-rotate-90" : ""}`} /></Button>}
              <div className={`space-y-0.5 ${!collapsed && navigation.collapsed[g.label] ? "hidden" : ""}`}>
                {g.items.map(({ to, label, icon: Icon }) => {
                  const active = path === to;
                  return (
                    <Link key={to} to={to} onClick={() => setOpen(false)} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
                      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                      <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
                      {!collapsed && counts[to] !== undefined && <span aria-label={`${counts[to]} ${to === "/recommendations" ? "open recommendations" : to === "/security" ? "open findings" : "active anomalies"}`} className="ml-auto rounded-full bg-secondary px-1.5 text-[10px] tabular-nums">{counts[to]}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-2 border-t border-border pt-2">
          <p className={`px-3 text-xs text-muted-foreground ${collapsed ? "lg:hidden" : ""}`}>Data source: <span className="text-foreground">{dataSource === "live" ? "Live" : "Demo data"}</span></p>
          <Button variant="ghost" size="sm" className="mt-1 hidden w-full justify-start text-muted-foreground lg:flex" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />{!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu overlay" />}

      <div className="min-w-0">
        <AccentBand className="h-1.5" />
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <Button variant="ghost" size="icon" className="size-10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-sm"><Link to="/" className="text-muted-foreground">Fjord Labs</Link><span className="px-2 text-muted-foreground">/</span><span className="font-medium">{current.label}</span>{activeTab && <span className="hidden xl:inline text-muted-foreground"> / {activeTab.label}</span>}</nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="hidden h-10 gap-2 border-border bg-card text-muted-foreground shadow-none md:flex" onClick={showPalette}><Search />Search<kbd className="rounded border border-border px-1.5 font-mono text-[10px]">⌘K</kbd></Button>
            <Button ref={searchButton} variant="ghost" size="icon" className="size-10 md:hidden" onClick={showPalette} aria-label="Search"><Search /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-10" aria-label={`Notifications, ${unread.length} unread`}>
                  <Bell />{unread.length > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread.length}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-sm font-medium">Notifications</p><Button size="sm" variant="ghost" disabled={!unread.length} onClick={() => setUnread([])}>Mark all as read</Button></div>
                <ul>{seedNotes.map((n) => (
                  <li key={n.id}><button onClick={() => setUnread((u) => u.filter((x) => x !== n.id))} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-secondary">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${unread.includes(n.id) ? "bg-primary" : "bg-transparent"}`} aria-hidden />
                    <span className="min-w-0"><span className="block text-xs text-muted-foreground">{n.kind} · {n.time}</span><span className="block text-sm">{n.text}</span></span>
                  </button></li>
                ))}</ul>
              </PopoverContent>
            </Popover>
            <Button onClick={scan} disabled={scanning} className="h-10 rounded-xl"><Radar className="" /><span className="hidden sm:inline">{scanning ? "Scanning…" : "Run scan"}</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="grid size-10 place-items-center rounded-full border border-border bg-card text-xs font-medium" aria-label="User menu">RT</button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Raman Tajerian</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><User />Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Currency · demo rates</DropdownMenuLabel>
                {CURRENCIES.map((c) => <DropdownMenuItem key={c} aria-pressed={currency === c} onSelect={() => setCurrency(c)}><span className={currency === c ? "font-semibold" : "text-muted-foreground"}>{c}</span>{currency === c && <span className="ml-auto text-primary">✓</span>}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={showHelp}><HelpCircle />Help</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => toast("Signed out (demo)")}><LogOut />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] min-w-0 space-y-8 p-4 pb-24 md:p-8 md:pb-24">{filteredPage && (dashboard.isPending || dashboard.isPlaceholderData) ? <CardSkeleton h="h-64" /> : filteredPage && dashboard.isSuccess && resources.length === 0 ? <FilterEmptyState /> : <>{backTarget && <Button variant="ghost" className="min-h-10 max-w-full justify-start whitespace-normal text-left" onClick={() => { navigate({ href: backTarget.href }); setBackTarget(null); }}><ArrowLeft />Back to previous page · {backTarget.label}</Button>}<div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" className="h-10 text-xs text-muted-foreground" aria-pressed={navigation.pinned.some((t) => targetKey(t) === targetKey(pageTarget))} onClick={() => pin(pageTarget)}><Pin />Pin page</Button>{activeTab && <Button variant="ghost" size="sm" className="h-10 text-xs text-muted-foreground" aria-pressed={navigation.pinned.some((t) => targetKey(t) === targetKey(tabTarget))} onClick={() => pin(tabTarget)}><Pin />Pin tab · {activeTab.label}</Button>}</div>{children}<CalculationNotes /></>}</main>
        <div className="mx-auto max-w-[1280px] px-4 md:px-8"><AccentBand className="h-1 rounded-full overflow-hidden" /></div>
        <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 pb-8 pt-4 text-xs text-muted-foreground md:px-8"><FjordLogo size={16} /><span>·</span><span>Fern v0.4.0</span><span>·</span><span>{dataSource === "live" ? "Live data" : "Demo data — all figures are simulated"}</span><span>·</span><span>Demo data as of 12 Oct 2026</span></footer>
      </div>

      <NavigationPalette open={palette} onOpenChange={setPalette} returnFocus={returnFocus} scan={scan} openHelp={() => { setHelp(true); }} createBudget={() => setBudgetOpen(true)} />
      <CreateBudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} scopes={alerts.data?.scopes ?? []} />
      <HelpDrawer open={help} onOpenChange={setHelp} returnFocus={returnFocus} />

    </div>
  );
}
