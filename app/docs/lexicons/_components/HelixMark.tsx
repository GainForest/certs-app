// The DNA-helix mark, lifted from the lexplorer. Draws two sine strands so the
// docs keep their biodiversity flavour. Inherits color from `currentColor`.

export function HelixMark({ size = 20, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  const length = 28;
  const amp = 7;
  const turns = 2.5;
  const samples = 80;
  const start = (32 - length) / 2;
  const ptsA: [number, number][] = [];
  const ptsB: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const y = start + t * length;
    const a = t * turns * Math.PI * 2;
    ptsA.push([16 + Math.sin(a) * amp, y]);
    ptsB.push([16 + Math.sin(a + Math.PI) * amp, y]);
  }
  const toPath = (pts: [number, number][]) =>
    "M " + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="block text-primary"
      aria-hidden="true"
    >
      <path d={toPath(ptsA)} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d={toPath(ptsB)} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
