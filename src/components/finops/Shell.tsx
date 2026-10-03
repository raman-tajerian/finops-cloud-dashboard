import { useState, type ReactNode } from "react";
import { Activity, BarChart3, Cloud, LayoutGrid, Menu, Radar, Server, Settings, Target, X } from "lucide-react";
import type { TimeRange } from "@/lib/finops-data";
import { Button } from "@/components/ui/button";

const nav = [
  { icon: LayoutGrid, label: "Overview", active: true },
  { icon: Server, label: "Infrastructure" },
  { icon: BarChart3, label: "Cost explorer" },
  { icon: Target, label: "Savings" },
  { icon: Activity, label: "Activity" },
  { icon: Settings, label: "Settings" },
];

export function Shell({ children, range, onRange, onScan, scanning }: {
  children: ReactNode;
  range: TimeRange;
  onRange: (r: TimeRange) => void;
  onScan: () => void;
  scanning: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[236px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-border bg-background px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-11 items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-[14px] bg-primary text-primary-foreground"><Cloud className="size-[18px]" strokeWidth={2} /></div>
          <span className="text-[15px] font-semibold">NimbusOps</span>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button>
        </div>
        <nav className="mt-9 space-y-1">
          {nav.map(({ icon: Icon, label, active }) => (
            <a key={label} href={`#${label.toLowerCase().replace(" ", "-")}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}>
              <Icon className={`size-4 ${active ? "text-primary" : ""}`} />{label}
            </a>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Q4 budget</span><span className="metric-numbers font-medium">83%</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[83%] rounded-full bg-warning" /></div>
          <p className="metric-numbers mt-3 text-xs text-muted-foreground">$248.7k of $300k</p>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu overlay" />}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="pulse-dot size-1.5 rounded-full bg-success text-success" />
            <span className="text-xs text-muted-foreground">All systems operational</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-xl bg-secondary p-1 md:flex">
              {(["24h", "7d", "30d", "YTD"] as TimeRange[]).map((item) => (
                <Button key={item} size="sm" variant={range === item ? "secondary" : "ghost"} className={`h-7 px-2.5 text-xs ${range === item ? "bg-card" : "text-muted-foreground"}`} onClick={() => onRange(item)}>{item}</Button>
              ))}
            </div>
            <Button onClick={onScan} disabled={scanning} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Radar className={scanning ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{scanning ? "Scanning…" : "Run scan"}</span>
            </Button>
            <div className="grid size-9 place-items-center rounded-full border border-border bg-card text-xs font-medium">RT</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1540px] space-y-5 p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}