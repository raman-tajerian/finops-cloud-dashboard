import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/lib/queries";
import { useCurrency } from "@/lib/money";
import { formatInsightFigure } from "@/lib/insight-format";
import { markNotificationsRead, unreadNotifications } from "@/lib/notifications";
import { setSession, useSession } from "@/lib/session-store";
import { CardSkeleton, EmptyState, ErrorState, PageHero } from "./States";

export function NotificationsWorkspace({ tab }: { tab: string }) {
  const q = useNotifications(), reads = useSession((s) => s.notificationReads);
  const [type, setType] = useState("all");
  const navigate = useNavigate();
  useCurrency();
  if (q.isPending) return <CardSkeleton h="h-64" />;
  if (q.isError) return <ErrorState message="We couldn't load notifications." onRetry={() => q.refetch()} />;
  const unread = unreadNotifications(q.data.items, reads);
  const items = q.data.items.filter((n) => (type === "all" || type === n.type) && (tab === "all" || (tab === "read" ? reads[n.id] : !reads[n.id])));
  return <div className="space-y-8"><PageHero label="Notifications" value={unread.length} description="Unread updates from the active filters. Read state lasts for this session only." /><div className="flex flex-wrap items-center justify-between gap-3"><Select value={type} onValueChange={setType}><SelectTrigger aria-label="Notification type" className="h-10 w-52"><SelectValue /></SelectTrigger><SelectContent>{["all", "anomaly", "budget", "security", "recommendation"].map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All types" : t[0]?.toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select><Button variant="secondary" disabled={!unread.length} onClick={() => setSession((s) => ({ ...s, notificationReads: markNotificationsRead(q.data.items, s.notificationReads) }))}><CheckCheck />Mark all as read</Button></div>
    {!items.length ? <EmptyState icon={Bell} title={q.data.items.length ? "No notifications match this type and read state." : "No notifications apply to the selected resources."} action="Show all notifications" onAction={() => { setType("all"); navigate({ to: "/notifications", search: (p) => ({ ...p, tab: "all" }) }); }} /> : <section className="organic-card p-7"><ul className="divide-y divide-border/40">{items.map((n) => <li key={n.id} className="flex items-start gap-3 py-5"><span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${reads[n.id] ? "bg-muted" : "bg-primary"}`} /><div className="min-w-0 flex-1"><p className="text-xs capitalize text-muted-foreground">{n.type} · {reads[n.id] ? "Read" : "Unread"}</p><h2 className="mt-1 break-words text-sm font-medium">{n.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{n.sentence.replace("{figure}", formatInsightFigure(n.figure))}</p></div><div className="flex shrink-0 flex-col sm:flex-row">{!reads[n.id] && <Button size="icon" variant="ghost" aria-label={`Mark ${n.title} as read`} onClick={() => setSession((s) => ({ ...s, notificationReads: { ...s.notificationReads, [n.id]: true } }))}><Check /></Button>}<Button asChild size="icon" variant="ghost"><Link to={n.link.to} search={(p) => ({ ...p, tab: n.link.tab, ...(n.type === "security" ? { finding: n.sourceId } : {}) })} aria-label={`Open ${n.title}`} onClick={() => setSession((s) => ({ ...s, notificationReads: { ...s.notificationReads, [n.id]: true } }))}><ArrowUpRight /></Link></Button></div></li>)}</ul></section>}
  </div>;
}