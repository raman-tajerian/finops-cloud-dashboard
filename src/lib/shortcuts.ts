// Global keyboard shortcuts. Pure helpers are exported for tests.
import { useEffect, useRef } from "react";

export interface ShortcutDef { keys: string; action: string; to?: string }
export const SHORTCUTS: ShortcutDef[] = [
  { keys: "G O", action: "Go to Overview", to: "/" },
  { keys: "G C", action: "Go to Cost Explorer", to: "/cost-explorer" },
  { keys: "G R", action: "Go to Resources", to: "/resources" },
  { keys: "G S", action: "Go to Security", to: "/security" },
  { keys: "G K", action: "Go to Kubernetes", to: "/kubernetes" },
  { keys: "/", action: "Search" },
  { keys: "?", action: "Keyboard shortcuts" },
  { keys: "Esc", action: "Close dialog or drawer" },
  { keys: "⌘K", action: "Command palette" },
];

export const CHORD_TIMEOUT_MS = 800;
const CHORDS: Record<string, string> = { o: "/", c: "/cost-explorer", r: "/resources", s: "/security", k: "/kubernetes" };

/** True when the event target is a text entry field where shortcuts must not fire. */
export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

/** True when a modal dialog is open (shortcuts other than Esc are paused). */
export function isDialogOpen(doc: Document): boolean {
  return !!doc.querySelector('[role="dialog"], [role="alertdialog"]');
}

/** Resolves a G-chord: returns the target path when `key` completes a chord started at `chordAt`. */
export function resolveChord(key: string, chordAt: number | null, now: number): string | null {
  if (chordAt === null || now - chordAt > CHORD_TIMEOUT_MS) return null;
  return CHORDS[key.toLowerCase()] ?? null;
}

export function useGlobalShortcuts(handlers: {
  navigate: (to: string) => void;
  openPalette: () => void;
  openHelp: () => void;
  closeOverlays: () => void;
}) {
  const chordAt = useRef<number | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const h = handlersRef.current;
      if (e.key === "Escape") { h.closeOverlays(); chordAt.current = null; return; }
      if (isEditableTarget(e.target) || isDialogOpen(document)) return;
      const now = Date.now();
      if (e.key.toLowerCase() === "g") { chordAt.current = now; return; }
      const to = resolveChord(e.key, chordAt.current, now);
      chordAt.current = null;
      if (to) { e.preventDefault(); h.navigate(to); return; }
      if (e.key === "/") { e.preventDefault(); h.openPalette(); return; }
      if (e.key === "?") { e.preventDefault(); h.openHelp(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
