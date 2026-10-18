import { useState } from "react";
import { Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/queries";
import { setSession, useSession } from "@/lib/session-store";
import { isEmail } from "@/lib/validators";
import { fakeKey } from "@/data/settings";
import { DEMO_TODAY, fmtDemoDate } from "@/data/resources";
import { teams } from "@/lib/filters";
import type { MemberRole, SettingsDto, TagMappingDto } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardSkeleton, EmptyState, ErrorState } from "./States";
import { Demo } from "./Reports";

export const SETTINGS_TABS = [["profile", "Profile"], ["workspace", "Workspace"], ["members", "Team members"], ["allocation", "Cost allocation"], ["notifications", "Notifications"], ["keys", "API keys"], ["appearance", "Appearance"]] as const;
const ROLES: MemberRole[] = ["Admin", "Editor", "Viewer"];
const today = DEMO_TODAY.toISOString().slice(0, 10);

export function SettingsWorkspace({ tab, dialog, onTab, onDialog }: { tab: string; dialog: string; onTab: (t: string) => void; onDialog: (d: string) => void }) {
  const q = useSettings();
  const ss = useSession((s) => s.settings);
  if (q.isPending) return <CardSkeleton h="h-48" />;
  if (q.isError) return <ErrorState message="We couldn't load settings." onRetry={() => q.refetch()} />;
  const d: SettingsDto = { ...q.data, ...Object.fromEntries(Object.entries(ss).filter(([, v]) => v !== undefined)) } as SettingsDto;
  const save = (patch: Partial<typeof ss>, msg = "Saved (demo, this session only)") => { setSession((s) => ({ ...s, settings: { ...s.settings, ...patch } })); toast.success(msg); };
  return (
    <Tabs value={tab} onValueChange={onTab} className="space-y-4">
      <div className="overflow-x-auto"><TabsList className="w-max">{SETTINGS_TABS.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList></div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Demo /> Changes are kept for this session only.</p>
      <TabsContent value="profile"><FormCard fields={[["name", "Name"], ["email", "Email"], ["title", "Title"]]} value={d.profile} validate={(v) => (isEmail(v.email) ? null : { email: "Enter a valid email." })} onSave={(v) => save({ profile: v as SettingsDto["profile"] })} /></TabsContent>
      <TabsContent value="workspace"><FormCard fields={[["name", "Workspace name"], ["currency", "Currency"], ["timezone", "Timezone"]]} value={d.workspace} validate={(v) => (v.name.trim() ? null : { name: "Name is required." })} onSave={(v) => save({ workspace: v as SettingsDto["workspace"] })} /></TabsContent>
      <TabsContent value="members"><Members d={d} open={dialog === "invite"} onOpen={(o) => onDialog(o ? "invite" : "")} save={save} /></TabsContent>
      <TabsContent value="allocation"><Allocation rows={d.mappings} save={save} /></TabsContent>
      <TabsContent value="notifications">
        <div className="organic-card overflow-x-auto p-2"><table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Event</th>{d.channels.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr></thead>
          <tbody>{d.events.map((e) => <tr key={e} className="border-t border-border"><td className="px-3 py-2">{e}</td>{d.channels.map((c) => { const k = `${e}|${c}`; const on = ss.notify[k] ?? c === "Email"; return <td key={c} className="px-3 py-2"><Switch checked={on} aria-label={`${e} via ${c}`} onCheckedChange={(v) => setSession((s) => ({ ...s, settings: { ...s.settings, notify: { ...s.settings.notify, [k]: v } } }))} /></td>; })}</tr>)}</tbody>
        </table></div>
      </TabsContent>
      <TabsContent value="keys"><Keys d={d} open={dialog === "create-key"} onOpen={(o) => onDialog(o ? "create-key" : "")} save={save} /></TabsContent>
      <TabsContent value="appearance">
        <div className="organic-card space-y-3 p-6"><Label>Table density</Label>
          <div className="flex gap-2">{(["comfortable", "compact"] as const).map((v) => <Button key={v} variant={ss.density === v ? "default" : "secondary"} aria-pressed={ss.density === v} className="capitalize" onClick={() => save({ density: v })}>{v}</Button>)}</div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

type Saver = (patch: Partial<ReturnType<typeof useSession<import("@/lib/session-store").DemoSettings>>>, msg?: string) => void;

function FormCard({ fields, value, validate, onSave }: { fields: [string, string][]; value: Record<string, string>; validate: (v: Record<string, string>) => Record<string, string> | null; onSave: (v: Record<string, string>) => void }) {
  const [v, setV] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form className="organic-card grid max-w-xl gap-4 p-6" onSubmit={(e) => { e.preventDefault(); const er = validate(v); setErrors(er ?? {}); if (!er) onSave(v); }}>
      {fields.map(([k, l]) => <div key={k} className="grid gap-1.5"><Label htmlFor={`f-${k}`}>{l}</Label><Input id={`f-${k}`} value={v[k] ?? ""} aria-invalid={!!errors[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />{errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}</div>)}
      <Button type="submit" className="justify-self-start">Save</Button>
    </form>
  );
}

function Members({ d, open, onOpen, save }: { d: SettingsDto; open: boolean; onOpen: (o: boolean) => void; save: Saver }) {
  const [email, setEmail] = useState(""); const [role, setRole] = useState<MemberRole>("Viewer"); const [err, setErr] = useState<string | null>(null);
  const invite = () => {
    if (!isEmail(email)) return setErr("Enter a valid email address.");
    if (d.members.some((m) => m.email === email.trim())) return setErr("This person is already a member.");
    save({ members: [...d.members, { id: `m-${d.members.length + 1}`, name: email.split("@")[0], email: email.trim(), role, lastActive: "Invited" }] }, `Invite recorded for ${email} (demo, not sent)`);
    setEmail(""); setErr(null); onOpen(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => onOpen(true)}><Plus className="size-4" />Invite member</Button></div>
      {d.members.length === 0 ? <EmptyState icon={Users} title="No members yet." action="Invite member" onAction={() => onOpen(true)} /> : (
        <div className="organic-card overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Role</th><th className="px-4 py-2 font-medium">Last active</th></tr></thead>
          <tbody>{d.members.map((m) => <tr key={m.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{m.name}</td><td className="px-4 py-2">{m.email}</td>
            <td className="px-4 py-2"><Select value={m.role} onValueChange={(r) => save({ members: d.members.map((x) => x.id === m.id ? { ...x, role: r as MemberRole } : x) })}><SelectTrigger className="h-9 w-28" aria-label={`Role for ${m.name}`}><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></td>
            <td className="px-4 py-2">{m.lastActive === "Invited" ? "Invited" : fmtDemoDate(m.lastActive)}</td></tr>)}</tbody></table></div>
      )}
      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite member</DialogTitle><DialogDescription>Demo — no invitation email is sent.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" type="email" value={email} aria-invalid={!!err} onChange={(e) => { setEmail(e.target.value); setErr(null); }} />{err && <p className="text-xs text-destructive">{err}</p>}</div>
            <div className="grid gap-1.5"><Label>Role</Label><Select value={role} onValueChange={(r) => setRole(r as MemberRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => onOpen(false)}>Cancel</Button><Button onClick={invite}>Send invite</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Allocation({ rows, save }: { rows: TagMappingDto[]; save: Saver }) {
  const [edit, setEdit] = useState<TagMappingDto | null>(null); const [err, setErr] = useState<string | null>(null);
  const commit = () => {
    if (!edit) return;
    if (!edit.tagKey.trim() || !edit.tagValue.trim()) return setErr("Tag key and value are required.");
    save({ mappings: rows.some((r) => r.id === edit.id) ? rows.map((r) => r.id === edit.id ? edit : r) : [...rows, edit] });
    setEdit(null); setErr(null);
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit({ id: `t-${rows.length + 1}-${rows.at(-1)?.id ?? "0"}`, tagKey: "costCenter", tagValue: "", team: teams[0] })}><Plus className="size-4" />Add mapping</Button></div>
      {rows.length === 0 ? <EmptyState icon={Users} title="No tag mappings." action="Add mapping" onAction={() => setEdit({ id: "t-1", tagKey: "costCenter", tagValue: "", team: teams[0] })} /> : (
        <div className="organic-card overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Tag key</th><th className="px-4 py-2 font-medium">Tag value</th><th className="px-4 py-2 font-medium">Team</th><th className="px-4 py-2" /></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-4 py-2">{r.tagKey}</td><td className="px-4 py-2">{r.tagValue}</td><td className="px-4 py-2">{r.team}</td>
            <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" aria-label="Edit mapping" onClick={() => setEdit(r)}><Pencil className="size-4" /></Button><Button size="sm" variant="ghost" aria-label="Delete mapping" onClick={() => save({ mappings: rows.filter((x) => x.id !== r.id) }, "Mapping deleted")}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tag mapping</DialogTitle><DialogDescription>Map a resource tag to a team.</DialogDescription></DialogHeader>
          {edit && <div className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="tk">Tag key</Label><Input id="tk" value={edit.tagKey} onChange={(e) => setEdit({ ...edit, tagKey: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="tv">Tag value</Label><Input id="tv" value={edit.tagValue} onChange={(e) => setEdit({ ...edit, tagValue: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Team</Label><Select value={edit.team} onValueChange={(t) => setEdit({ ...edit, team: t })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>}
          <DialogFooter><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={commit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Keys({ d, open, onOpen, save }: { d: SettingsDto; open: boolean; onOpen: (o: boolean) => void; save: Saver }) {
  const [name, setName] = useState(""); const [shown, setShown] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const create = () => {
    if (!name.trim()) return setErr("Give the key a name.");
    const k = fakeKey(d.keys.length + 1);
    save({ keys: [...d.keys, { id: `k-${d.keys.length + 1}`, name: name.trim(), masked: `fern_demo_••••••••${k.slice(-4)}`, created: today, lastUsed: null }] }, "Demo key created");
    setShown(k); setName(""); setErr(null);
  };
  const close = () => { setShown(null); onOpen(false); };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => onOpen(true)}><Plus className="size-4" />Create key</Button></div>
      <div className="organic-card overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Key</th><th className="px-4 py-2 font-medium">Created</th><th className="px-4 py-2 font-medium">Last used</th><th className="px-4 py-2" /></tr></thead>
        <tbody>{d.keys.map((k) => <tr key={k.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{k.name}</td><td className="px-4 py-2 font-mono text-xs">{k.masked}</td><td className="px-4 py-2">{fmtDemoDate(k.created)}</td><td className="px-4 py-2">{k.lastUsed ? fmtDemoDate(k.lastUsed) : "Never"}</td>
          <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" aria-label={`Revoke ${k.name}`} onClick={() => save({ keys: d.keys.filter((x) => x.id !== k.id) }, "Key revoked")}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpen(true) : close())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create API key</DialogTitle><DialogDescription>Demo only. The key below is fake and works nowhere. Never store real secrets in this app.</DialogDescription></DialogHeader>
          {shown ? (
            <div className="grid gap-3"><p className="text-sm">Shown once — it will be masked after you close this dialog.</p>
              <div className="flex items-center gap-2 rounded-xl border border-border p-3"><code className="min-w-0 flex-1 break-all text-xs">{shown}</code><Button size="sm" variant="ghost" aria-label="Copy key" onClick={() => { void navigator.clipboard?.writeText(shown); toast.success("Copied fake key"); }}><Copy className="size-4" /></Button></div></div>
          ) : (
            <div className="grid gap-1.5"><Label htmlFor="key-name">Name</Label><Input id="key-name" value={name} aria-invalid={!!err} onChange={(e) => { setName(e.target.value); setErr(null); }} />{err && <p className="text-xs text-destructive">{err}</p>}</div>
          )}
          <DialogFooter>{shown ? <Button onClick={close}>Done</Button> : <><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={create}>Create</Button></>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
