// Shared table density: one session-only setting (Settings > Appearance) drives every data table.
import { setSession, useSession } from "@/lib/session-store";

export type Density = "compact" | "comfortable";

export function useTableDensity() {
  const density = useSession((s) => s.settings.density);
  const compact = density === "compact";
  return {
    density,
    compact,
    setDensity: (d: Density) => setSession((s) => ({ ...s, settings: { ...s.settings, density: d } })),
    toggle: () => setSession((s) => ({ ...s, settings: { ...s.settings, density: compact ? "comfortable" : "compact" } })),
    /** Row/cell vertical padding shared by all data tables. */
    py: compact ? "py-1.5" : "py-3",
    /** Header cell padding. */
    pyHead: compact ? "py-1.5" : "py-2.5",
  };
}
