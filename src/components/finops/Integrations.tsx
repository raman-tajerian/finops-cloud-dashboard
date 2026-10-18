import { useMemo, useState } from "react";
import { ArrowUpDown, Plug } from "lucide-react";
import { toast } from "sonner";
import { useIntegrations } from "@/lib/queries";
import { setSession, useSession } from "@/lib/session-store";
import { testConnection } from "@/data/integrations";
import type { IntegrationDto, SyncRunDto } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardSkeleton, EmptyState, ErrorState, SectionHeading, StatusBadge } from "./States";
import { Demo } from "./Reports";

const CRED: Record<string, { label: string; placeholder: string }> = {
  "aws-role-arn": { label: "IAM role ARN", placeholder: "arn:aws:iam::123456789012:role/FernReadOnly" },
  "azure-sp-id": { label: "Service principal (application) ID", placeholder: "00000000-0000-0000-0000-000000000000" },
  "gcp-project-id": { label: "Project ID", placeholder: "fjord-billing-prod" },
};
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

export function IntegrationsWorkspace() {
  const q = useIntegrations();
  const overrides = useSession((s) => s.integrations);
  const [active, setActive] = useState<IntegrationDto | null>(null);
  if (q.isPending) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><CardSkeleton h="h-16" /><CardSkeleton h="h-16" /><CardSkeleton h="h-16" /></div>;
  if (q.isError) return <ErrorState message="We couldn't load integrations." onRetry={() => q.refetch()} />;
  const list = q.data.integrations.map((i) => (overrides[i.id] ? { ...i, status: overrides[i.id] } : i));
  if (!list.length) return <EmptyState icon={Plug} title="No integrations available." action="Retry" onAction={() => q.refetch()} />;
  return (
    <div className="space-y-8">
      <p className="organic-card flex flex-wrap items-center gap-2 p-4 text-sm text-muted-foreground"><Demo /> All integrations are simulated. No network calls are made and no credentials are stored.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((i) => (
          <article key={i.id} className="organic-card flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{i.name}</h3>
              <StatusBadge tone={i.status === "Connected" ? "success" : i.status === "Error" ? "critical" : "idle"}>{i.status}</StatusBadge></div>
            <p className="text-xs text-muted-foreground">{i.lastSync ? `Last sync ${fmtTime(i.lastSync)}` : "Never synced"}</p>
            <Button className="mt-auto" variant={i.status === "Connected" ? "secondary" : "default"} onClick={() => setActive(i)}>{i.status === "Not connected" ? "Connect" : "Configure"}</Button>
          </article>
        ))}
      </div>
      <SyncHistory rows={q.data.history} />
      <ConnectDialog item={active} onClose={() => setActive(null)} />
    </div>
  );
}

function ConnectDialog({ item, onClose }: { item: IntegrationDto | null; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const cred = item ? CRED[item.credential] : undefined;
  const close = () => { setValue(""); setResult(null); onClose(); };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Connect {item?.name}</DialogTitle><DialogDescription>Simulated. Fern only ever needs read-only access. Never paste secrets or keys here.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div><p className="text-sm font-medium">Required read-only permissions</p><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{item?.permissions.map((p) => <li key={p}>{p}</li>)}</ul></div>
          {cred && <div className="grid gap-1.5"><Label htmlFor="cred">{cred.label}</Label><Input id="cred" placeholder={cred.placeholder} value={value} autoComplete="off" onChange={(e) => { setValue(e.target.value); setResult(null); }} /><p className="text-xs text-muted-foreground">Format check only — this is an identifier, not a secret.</p></div>}
          {result && <p role="status" className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}>{result.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => item && setResult(testConnection(item.credential, value))}>Test connection</Button>
          <Button disabled={!item || !testConnection(item.credential, value).ok} onClick={() => { if (!item) return; setSession((s) => ({ ...s, integrations: { ...s.integrations, [item.id]: "Connected" } })); toast.success(`${item.name} connected (demo)`); close(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Key = keyof Pick<SyncRunDto, "integration" | "started" | "status" | "durationSec" | "records">;
function SyncHistory({ rows }: { rows: SyncRunDto[] }) {
  const [sort, setSort] = useState<{ k: Key; asc: boolean }>({ k: "started", asc: false });
  const sorted = useMemo(() => [...rows].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1); }), [rows, sort]);
  const cols: [Key, string][] = [["integration", "Integration"], ["started", "Started"], ["status", "Status"], ["durationSec", "Duration"], ["records", "Records"]];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2"><SectionHeading title="Sync history" description="Seeded demo runs." /><Demo /></div>
      <div className="organic-card overflow-x-auto"><table className="w-full min-w-[600px] text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr>{cols.map(([k, l]) => <th key={k} className="px-4 py-2 font-medium" aria-sort={sort.k === k ? (sort.asc ? "ascending" : "descending") : "none"}><button className="inline-flex min-h-10 items-center gap-1" onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}>{l}<ArrowUpDown className="size-3" /></button></th>)}</tr></thead>
        <tbody>{sorted.map((r) => (
          <tr key={r.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{r.integration}</td><td className="px-4 py-2">{fmtTime(r.started)}</td>
            <td className="px-4 py-2"><StatusBadge tone={r.status === "Success" ? "success" : r.status === "Failed" ? "critical" : "warning"}>{r.status}</StatusBadge></td>
            <td className="metric-numbers px-4 py-2">{r.durationSec}s</td><td className="metric-numbers px-4 py-2">{r.records.toLocaleString("en-US")}</td></tr>
        ))}</tbody></table></div>
    </section>
  );
}
