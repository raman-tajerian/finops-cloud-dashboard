import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronsLeft, ChevronsUpDown, Cloud, LogOut, Menu, Radar, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { navGroups, navItems } from "@/lib/nav";
import { dataSource } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDashboard } from "@/lib/queries";

const seedNotes = [
  { id: 1, kind: "Anomaly", text: "+140% Azure Blob Storage egress", time: "2h ago" },
  { id: 2, kind: "Budget", text: "Q4 budget passed 80% threshold", time: "5h ago" },
  { id: 3, kind: "Remediation", text: "Auto-scaler removed 3 idle nodes", time: "1d ago" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [unread, setUnread] = useState<number[]>(seedNotes.map((n) => n.id));
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const resources = useDashboard().data?.resources ?? [];
  const current = navItems.find((i) => i.to === path) ?? navItems[0]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setOpen(false), [path]);

  const scan = () => { setScanning(true); window.setTimeout(() => { setScanning(false); toast.success("Scan complete — 1,872 resources checked"); }, 1600); };
  const go = (to: string) => { setPalette(false); navigate({ to }); };

  return (
    <div className={`min-h-screen bg-background lg:grid ${collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[248px_minmax(0,1fr)]"}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-sidebar-bg px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : ""} ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-11 w-full min-w-0 items-center gap-3 rounded-xl px-2 text-left hover:bg-secondary">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground"><Cloud className="size-4" /></span>
              {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Acme Corp</span><span className="block truncate text-xs text-muted-foreground">Production</span></span>}
              {!collapsed && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {["Acme Corp – Production", "Acme Corp – Staging", "Acme Labs – Sandbox"].map((w) => <DropdownMenuItem key={w} onSelect={() => toast(`Switched to ${w} (demo)`)}>{w}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="absolute right-2 top-4 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button>

        <nav className="mt-6 flex-1 space-y-5 overflow-y-auto" aria-label="Main">
          {navGroups.map((g) => (
            <div key={g.label}>
              {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{g.label}</p>}
              <div className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon }) => {
                  const active = path === to;
                  return (
                    <Link key={to} to={to} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
                      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                      <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-3 border-t border-border pt-3">
          <p className={`px-3 text-xs text-muted-foreground ${collapsed ? "lg:hidden" : ""}`}>Data source: <span className="text-foreground">{dataSource === "live" ? "Live" : "Demo data"}</span></p>
          <Button variant="ghost" size="sm" className="mt-2 hidden w-full justify-start text-muted-foreground lg:flex" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />{!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu overlay" />}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <Button variant="ghost" size="icon" className="size-10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <nav aria-label="Breadcrumb" className="min-w-0 truncate text-sm"><span className="text-muted-foreground">Acme Corp</span><span className="px-2 text-muted-foreground">/</span><span className="font-medium">{current.label}</span></nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="hidden h-10 gap-2 border-border bg-card text-muted-foreground shadow-none md:flex" onClick={() => setPalette(true)}><Search />Search<kbd className="rounded border border-border px-1.5 font-mono text-[10px]">⌘K</kbd></Button>
            <Button variant="ghost" size="icon" className="size-10 md:hidden" onClick={() => setPalette(true)} aria-label="Search"><Search /></Button>
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
            <Button onClick={scan} disabled={scanning} className="h-10 rounded-xl"><Radar className={scanning ? "animate-spin" : ""} /><span className="hidden sm:inline">{scanning ? "Scanning…" : "Run scan"}</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="grid size-10 place-items-center rounded-full border border-border bg-card text-xs font-medium" aria-label="User menu">RT</button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Raman Tajerian</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><User />Profile</DropdownMenuItem>
                <DropdownMenuItem disabled>Theme: dark matte</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => toast("Signed out (demo)")}><LogOut />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1540px] min-w-0 space-y-6 p-4 pb-24 md:p-8 md:pb-24">{children}</main>
        <footer className="mx-auto flex max-w-[1540px] flex-wrap gap-3 px-4 pb-8 text-xs text-muted-foreground md:px-8"><span>NimbusOps v0.4.0</span><span>·</span><span>{dataSource === "live" ? "Live data" : "Demo data — all figures are simulated"}</span></footer>
      </div>

      <CommandDialog open={palette} onOpenChange={setPalette}>
        <CommandInput placeholder="Jump to a page, resource or action…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">{navItems.map((i) => <CommandItem key={i.to} onSelect={() => go(i.to)}><i.icon />{i.label}</CommandItem>)}</CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go("/budgets")}>Create budget</CommandItem>
            <CommandItem onSelect={() => { setPalette(false); scan(); }}>Run full scan</CommandItem>
            <CommandItem onSelect={() => go("/reports")}>Export CSV</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Resources">{resources.map((r) => <CommandItem key={r.id} value={`${r.name} ${r.type} ${r.region}`} onSelect={() => go("/resources")}>{r.name}<span className="ml-auto text-xs text-muted-foreground">{r.type}</span></CommandItem>)}</CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
