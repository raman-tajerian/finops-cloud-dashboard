// Dismissible getting-started checklist on Overview. Step completion is read
// from session-only demo state; only the "dismissed" flag touches localStorage.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Cloud, Rocket, UserPlus, Wallet, X } from "lucide-react";
import { useSession } from "@/lib/session-store";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fern-onboarding-dismissed";
function readDismissed(): boolean {
  try { return window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
function writeDismissed() {
  try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable — the card returns next visit */ }
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const connected = useSession((s) => Object.values(s.integrations).includes("Connected"));
  const hasBudget = useSession((s) => s.budgets.length > 0);
  const reviewed = useSession((s) => Object.values(s.recs).some((r) => r.status !== "Open"));
  const invited = useSession((s) => (s.settings.members ?? []).some((m) => m.lastActive === "Invited"));
  const steps = [
    { id: "connect", icon: Cloud, label: "Connect a cloud account", to: "/integrations", done: connected },
    { id: "budget", icon: Wallet, label: "Set a budget", to: "/budgets", done: hasBudget },
    { id: "review", icon: Rocket, label: "Review recommendations", to: "/recommendations", done: reviewed },
    { id: "invite", icon: UserPlus, label: "Invite a teammate", to: "/settings", done: invited },
  ] as const;
  if (dismissed) return null;
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section aria-label="Getting started" className="organic-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium leading-snug text-foreground">Get started with Fern</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{doneCount} of {steps.length} done · demo progress, this session only</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Dismiss checklist"
          onClick={() => { writeDismissed(); setDismissed(true); }}><X className="size-4" /></Button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link to={s.to} className="flex min-h-10 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary">
              <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`} aria-hidden>
                <Check className="size-3" />
              </span>
              <s.icon className="size-4 shrink-0 text-muted-foreground" />
              <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
