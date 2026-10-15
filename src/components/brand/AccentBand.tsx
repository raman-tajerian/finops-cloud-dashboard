/** Four flat brand blocks (sage, slate, sand, terracotta) at 40/25/20/15 %. */
export function AccentBand({ className = "h-1.5" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex w-full ${className}`}>
      <span className="w-[40%] bg-chart-1" />
      <span className="w-[25%] bg-chart-2" />
      <span className="w-[20%] bg-chart-6" />
      <span className="w-[15%] bg-chart-3" />
    </div>
  );
}
