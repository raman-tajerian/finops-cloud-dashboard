/** Decorative brand shapes beside the Overview title (desktop/tablet only). */
export function HeroShapes() {
  return (
    <svg aria-hidden viewBox="0 0 220 90" width={220} height={90} className="pointer-events-none absolute bottom-2 right-2 hidden md:block">
      <path d="M40 90 V2 A88 88 0 0 1 128 90 Z" className="fill-brand-burgundy" />
      <circle cx="132" cy="30" r="28" className="fill-brand-mustard" />
      <rect x="160" y="36" width="56" height="52" rx="20" className="fill-brand-sand" />
    </svg>
  );
}
