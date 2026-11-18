'use client';

import { useId, useMemo, useState } from 'react';
import type { IndexPoint } from '@/domain/types';
import { formatEUR } from '@/lib/format';

const WIDTH = 400;
const HEIGHT = 84;
const PAD_Y = 8;

/** Price of 1M in-game cash over the last 48 hours. One series, so no legend. */
export function IndexChart({
  series,
  bare = false,
}: {
  series: readonly IndexPoint[];
  /** Drops the surrounding box, for use inside a column that already has structure. */
  bare?: boolean;
}) {
  const gradient = useId();
  const stroke = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { line, area, points, change } = useMemo(() => {
    const values = series.map((point) => point.priceMinor);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const coords = series.map((point, index) => ({
      x: (index / (series.length - 1)) * WIDTH,
      y: PAD_Y + (1 - (point.priceMinor - min) / span) * (HEIGHT - PAD_Y * 2),
    }));
    const path = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join('');
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    return {
      line: path,
      area: `${path}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`,
      points: coords,
      change: first === 0 ? 0 : ((last - first) / first) * 100,
    };
  }, [series]);

  const index = hover ?? series.length - 1;
  const point = series[index];
  const coord = points[index];
  if (!point || !coord) return null;

  const up = change >= 0;
  const when = point.hoursAgo === 0 ? 'Now' : `${point.hoursAgo}h ago`;

  return (
    <figure className={bare ? undefined : 'glass-inset rounded-[4px] p-3'}>
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-white/50">Cash index · €/1M · 48h</p>
          <p className="mt-0.5 font-mono text-lg leading-none font-medium tabular-nums">
            {formatEUR(point.priceMinor)}
            <span className="ml-2 text-[11px] font-normal text-white/45">{when}</span>
          </p>
        </div>
        <p className="flex items-center gap-1 rounded-md bg-white/6 px-1.5 py-1 font-mono text-[11px] text-white/80 tabular-nums">
          <span aria-hidden="true" className={up ? 'text-emerald-400' : 'text-red-400'}>
            {up ? '▲' : '▼'}
          </span>
          <span className="sr-only">{up ? 'Up' : 'Down'}</span>
          {Math.abs(change).toFixed(1)}%
        </p>
      </figcaption>

      <div
        className="relative mt-2 touch-none"
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
          setHover(Math.round(ratio * (series.length - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-[68px] w-full overflow-visible"
          role="img"
          aria-label={`Cash index over 48 hours, currently ${formatEUR(series[series.length - 1]?.priceMinor ?? 0)} per million, ${up ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} percent.`}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4ff2cf" stopOpacity="0.38" />
              <stop offset="1" stopColor="#4ff2cf" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={stroke} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="0.55" stopColor="#9ff7e4" />
              <stop offset="1" stopColor="#4ff2cf" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradient})`} />
          <path
            d={line}
            fill="none"
            stroke={`url(#${stroke})`}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {hover !== null && (
            <line
              x1={coord.x}
              x2={coord.x}
              y1="0"
              y2={HEIGHT}
              stroke="rgb(255 255 255 / 0.28)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* The marker is HTML so it stays round while the SVG stretches. */}
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-ink-900"
          style={{ left: `${(coord.x / WIDTH) * 100}%`, top: `${(coord.y / HEIGHT) * 100}%` }}
        />
      </div>
    </figure>
  );
}
