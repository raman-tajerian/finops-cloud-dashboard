import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Server, Wallet, ShieldCheck, LineChart, Settings, Cloud, Menu, X, Radar, ChevronDown,
} from "lucide-react";
import type { TimeRange } from "@/lib/finops-data";

const nav = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Server, label: "Resources" },
  { icon: Wallet, label: "Cost Explorer" },
  { icon: LineChart, label: "Forecasts" },
  { icon: ShieldCheck, label: "Security" },
  { icon: Settings, label: "Settings" },
];

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
      <span className="pulse-dot size-1.5 rounded-full bg-success text-success" />
      {label}
    </span>
  );
}

export function Shell({
  children, range, onRange, onScan, scanning,
}: { children: ReactNode; range: TimeRange; onRange: (r: TimeRange) => void; onScan: () => void; scanning: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="grid size-8 place-items-center rounded-lg btn-glow"><Cloud className="size-4" /></div>
          <span className="font-semibold tracking-tight">Nimbus<span className="text-muted-foreground">Ops</span></span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {nav.map(({ icon: Icon, label, active }) => (
            <a key={label} href="#"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
              <Icon className={`size-4 ${active ? "text-primary" : ""}`} />{label}
            </a>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 rounded-xl bg-muted p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Q4 budget</p>
          <p className="mt-1">$248.7k of $300k used</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full w-[83%] rounded-full bg-primary" /></div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/60 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-12">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="hidden items-center gap-2 md:flex">
            <StatusBadge label="AWS: Healthy" />
            <StatusBadge label="Azure: Operational" />
          </div>
          <button className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground xl:flex">
            Production <ChevronDown className="size-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden rounded-lg border border-border bg-secondary/50 p-0.5 sm:flex">
              {(["24h", "7d", "30d", "YTD"] as TimeRange[]).map((r) => (
                <button key={r} onClick={() => onRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${range === r ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {r === "24h" ? "Last 24h" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "YTD"}
                </button>
              ))}
            </div>
            <button onClick={onScan} disabled={scanning} className="btn-glow inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-70">
              <Radar className={`size-4 ${scanning ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{scanning ? "Scanning…" : "Run Full Scan"}</span>
            </button>
            <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">RT</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-10 p-5 md:p-12">{children}</main>
      </div>
    </div>
  );
}
