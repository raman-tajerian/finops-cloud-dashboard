// Fjord Labs brand mark — the only file allowed to hold the exact brand hex values.
const BURGUNDY = "#7A1F3D";
const MUSTARD = "#D9A441";
const SAND = "#E8D8C0";

export type BrandSize = 16 | 24 | 32 | 48;

/** Organic fjord: sand water between a burgundy and a mustard cliff. Mono omits the water. */
export function FjordMark({ size = 24, mono = false, className = "", decorative = false }: { size?: BrandSize; mono?: boolean; className?: string; decorative?: boolean }) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Fjord Labs" };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} {...a11y}>
      {!mono && <path d="M13 30 C12 24 14 17 14 9 C14 12 16 12 17 11 C19 11 19 13 19 15 C19 21 21 26 20 30 Z" fill={SAND} />}
      <path d="M2 30 L2 12 C2 6 6 2 10 2 C13 2 14 5 14 9 C14 17 12 24 13 30 Z" fill={mono ? "currentColor" : BURGUNDY} />
      <path d="M30 30 L30 16 C30 11 27 8 24 8 C21 8 19 11 19 15 C19 21 21 26 20 30 Z" fill={mono ? "currentColor" : MUSTARD} />
    </svg>
  );
}

/** Mark inside a rounded tile — favicon-style workspace avatar. */
export function FjordAvatar({ size = 32 }: { size?: BrandSize }) {
  return (
    <span role="img" aria-label="Fjord Labs" className="grid shrink-0 place-items-center rounded-[10px] border border-[#E7E1D8] bg-[#FFFFFF]" style={{ width: size, height: size }}>
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
