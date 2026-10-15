// Fjord Labs brand mark — exact brand shades from the token palette (sage, slate blue, sand).
const SAGE = "#4F6F5A";
const SLATE = "#5B7083";
const SAND = "#D9CDBB";

export type BrandSize = 16 | 24 | 32 | 48;

/** Two rounded cliffs with a narrow water channel between them. */
export function FjordMark({ size = 24, mono = false, className = "", decorative = false }: { size?: BrandSize; mono?: boolean; className?: string; decorative?: boolean }) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Fjord Labs" };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} {...a11y}>
      <path d="M4 28V12c0-4.4 3.6-8 8-8h1v24H4Z" fill={mono ? "currentColor" : SAGE} />
      <path d="M14.5 28 16 8l1.5 20Z" fill={mono ? "currentColor" : SAND} opacity={mono ? 0.45 : 1} />
      <path d="M28 28V18c0-4.4-3.6-8-8-8h-1v18h9Z" fill={mono ? "currentColor" : SLATE} opacity={mono ? 0.75 : 1} />
    </svg>
  );
}

/** Mark inside a rounded tile — favicon-style workspace avatar. */
export function FjordAvatar({ size = 32 }: { size?: BrandSize }) {
  return (
    <span role="img" aria-label="Fjord Labs" className="grid shrink-0 place-items-center rounded-[10px] border border-border bg-card" style={{ width: size, height: size }}>
      <FjordMark size={size >= 32 ? 24 : 16} decorative />
    </span>
  );
}

const text: Record<BrandSize, string> = { 16: "text-xs", 24: "text-sm", 32: "text-base", 48: "text-2xl" };

export function FjordLogo({ size = 24, mono = false, className = "" }: { size?: BrandSize; mono?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="Fjord Labs" className={`inline-flex items-center gap-2 ${className}`}>
      <FjordMark size={size} mono={mono} decorative />
      <span aria-hidden className={`font-sans font-semibold tracking-[0.02em] text-foreground ${text[size]}`}>
        Fjord <span className="font-normal text-muted-foreground">Labs</span>
      </span>
    </span>
  );
}
