/**
 * The drifting contour lines that sit behind quiet, text-heavy sections -
 * Driessen's background accent, rebuilt rather than traced.
 *
 * Why an SVG and not a background image: the lines have to pick up the section
 * they sit on (ink on bone, bone on ink) and stay a hairline at every zoom
 * level. `stroke="currentColor"` means the caller sets the colour and the
 * opacity with a normal text utility, and `vector-effect="non-scaling-stroke"`
 * keeps the line 1px however the band is scaled.
 *
 * Why one <path> and nine <use>s: every line is the same wave, moved down and
 * stretched a little. Emitting the geometry once and referencing it keeps this
 * at a few hundred bytes of HTML instead of a few kilobytes per instance - and
 * there are five instances across the site.
 *
 * Nothing here animates. These are meant to be noticed on the second look, not
 * the first, and a moving background under body copy is exactly the kind of
 * thing `prefers-reduced-motion` exists to switch off.
 */

const VIEW_W = 1440;
/** Sampling step along the wave. 16 points is plenty once it is smoothed. */
const STEP = 90;
/** Largest value `wave` can return, used to size the viewBox. */
const WAVE_PEAK = 0.62 + 0.27 + 0.44;

/**
 * Three sine waves at unrelated frequencies, so the result reads as terrain
 * rather than as a sine wave. `seed` shifts every phase together, which is what
 * stops two instances on the same page looking like the same picture twice.
 *
 * Deterministic on purpose - `Math.random()` here would produce different
 * markup on the server and the client and trip a hydration mismatch.
 */
function wave(x: number, seed: number): number {
  const p = seed * 1.7;
  return (
    Math.sin(x * 0.00412 + p) * 0.62 +
    Math.sin(x * 0.00733 + p * 1.9 + 1.1) * 0.27 +
    Math.sin(x * 0.00189 - p * 0.8 + 2.3) * 0.44
  );
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom through the sampled points, converted to cubic beziers. */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C${round(c1x)} ${round(c1y)},${round(c2x)} ${round(c2y)},${round(p2[0])} ${round(p2[1])}`;
  }
  return d;
}

export interface ContourLinesProps {
  /** Positioning and colour - an absolute position plus a text colour utility. */
  className?: string;
  /** How many lines in the family. */
  count?: number;
  /** Gap between lines, in viewBox units (the box is 1440 wide). */
  spacing?: number;
  /** Wave height. Roughly 1.5x the spacing reads like the reference. */
  amplitude?: number;
  /** Any number. Changes the wave shape without changing anything else. */
  seed?: number;
}

export default function ContourLines({
  className,
  count = 9,
  spacing = 26,
  amplitude = 34,
  seed = 0,
}: ContourLinesProps) {
  // The family fans out downwards: the top line is flattest, the bottom one
  // deepest. That slight divergence is what makes it read as contours of one
  // surface rather than a stack of copies.
  const scaleAt = (i: number) => (count < 2 ? 1 : 0.72 + (0.58 * i) / (count - 1));
  const maxScale = scaleAt(count - 1);

  const reach = amplitude * WAVE_PEAK * maxScale;
  const viewH = Math.ceil((count - 1) * spacing + reach * 2);
  const top = reach;

  const points: (readonly [number, number])[] = [];
  for (let x = 0; x <= VIEW_W; x += STEP) {
    points.push([x, amplitude * wave(x, seed)]);
  }
  // Guarantee the wave reaches the right edge even when STEP does not divide
  // VIEW_W - otherwise the last stretch is a straight line.
  if (points[points.length - 1][0] !== VIEW_W) {
    points.push([VIEW_W, amplitude * wave(VIEW_W, seed)]);
  }

  const id = `contour-${seed}-${count}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      // Height comes from the width, so the waves keep their proportions
      // instead of being squashed to whatever the section happens to be.
      className={className}
      style={{
        width: "100%",
        height: "auto",
        pointerEvents: "none",
        // Dissolve at both edges rather than stopping dead against the gutter.
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
        maskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
      }}
    >
      <defs>
        {/* vector-effect is not an inherited property, so it has to sit on the
            geometry itself - on the <g> it would never reach the clones and the
            hairline would scale with the band: sub-pixel on a phone, 2px on a
            wide desktop. stroke and fill do inherit, so those stay on the <g>. */}
        <path id={id} d={smoothPath(points)} vectorEffect="non-scaling-stroke" />
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {Array.from({ length: count }, (_, i) => (
          // translate is written after scale so it is applied last: the line
          // lands at `y`, then the wave around it is stretched in place.
          <use
            key={i}
            href={`#${id}`}
            transform={`translate(0 ${round(top + i * spacing)}) scale(1 ${round(scaleAt(i))})`}
          />
        ))}
      </g>
    </svg>
  );
}
