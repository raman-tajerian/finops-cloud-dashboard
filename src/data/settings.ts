// Seeded demo settings for the Fjord Labs workspace. Session-only; no real keys exist.
import type { SettingsDto } from "@/types/finops";
export const NOTIFY_CHANNELS = ["Email", "Slack", "Teams"];
export const NOTIFY_EVENTS = ["Budget threshold", "Cost anomaly", "New recommendation", "Security finding", "Weekly digest"];
export function buildSettings(): SettingsDto {
  return {
    profile: { name: "Alex Berg", email: "alex@fjordlabs.example", title: "FinOps lead" },
    workspace: { name: "Fjord Labs", currency: "USD", timezone: "Europe/Stockholm" },
    members: [
      { id: "m1", name: "Alex Berg", email: "alex@fjordlabs.example", role: "Admin", lastActive: "2026-10-12" },
      { id: "m2", name: "Sara Lind", email: "sara@fjordlabs.example", role: "Editor", lastActive: "2026-10-11" },
      { id: "m3", name: "Omar Haddad", email: "omar@fjordlabs.example", role: "Editor", lastActive: "2026-10-09" },
      { id: "m4", name: "Mia Holm", email: "mia@fjordlabs.example", role: "Viewer", lastActive: "2026-10-02" },
    ],
    mappings: [
      { id: "t1", tagKey: "costCenter", tagValue: "cc-platform", team: "Platform" },
      { id: "t2", tagKey: "costCenter", tagValue: "cc-data", team: "Data" },
      { id: "t3", tagKey: "app", tagValue: "billing", team: "FinOps" },
      { id: "t4", tagKey: "app", tagValue: "streaming", team: "Media" },
    ],
    keys: [
      { id: "k1", name: "CI reporting", masked: "fern_demo_••••••••3f2a", created: "2026-08-14", lastUsed: "2026-10-11" },
      { id: "k2", name: "BI export", masked: "fern_demo_••••••••91c0", created: "2026-09-02", lastUsed: null },
    ],
    channels: NOTIFY_CHANNELS, events: NOTIFY_EVENTS,
  };
}
/** Clearly fake demo key; not usable anywhere. */
export const fakeKey = (n: number) => `fern_demo_NOT_A_REAL_KEY_${String(n).padStart(4, "0")}`;
