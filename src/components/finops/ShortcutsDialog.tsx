import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHORTCUTS } from "@/lib/shortcuts";

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Everything here also works with mouse and touch.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{s.action}</span>
              <span className="flex gap-1">{s.keys.split(" ").map((k, i) => (
                <kbd key={i} className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>
              ))}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
