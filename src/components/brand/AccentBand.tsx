/** Four flat brand blocks (burgundy, mustard, sand, ink) at 40/25/20/15 %. */
export function AccentBand({ className = "h-1.5" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex w-full ${className}`}>
      <span className="w-[40%] bg-brand-burgundy" />
      <span className="w-[25%] bg-brand-mustard" />
      <span className="w-[20%] bg-brand-sand" />
      <span className="w-[15%] bg-brand-ink" />
    </div>
  );
}
