'use client';

import { motion } from 'motion/react';
import { formatDelivery } from '@/lib/format';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';

const WIDTH = 184;
const HEIGHT = 118;

/** A stable pseudo-random point for a listing, so each product has its own hand-off spot. */
function spot(id: string): { x: number; y: number } {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const a = (hash >>> 0) / 4294967296;
  const b = ((Math.imul(hash, 2654435761) >>> 0) % 1000) / 1000;
  return { x: 28 + a * 96, y: 18 + b * 44 };
}

/**
 * The radar: a corner map with the buyer, the hand-off point and the route between them.
 * It is set dressing, in the manner of an open-world game's HUD, but the two bars under it
 * are real: how much of the price is protected by escrow, and how buyers rate the seller.
 */
export function RadarHud() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const listing = useMarket(
    (state) => state.listings.find((item) => item.id === state.selectedListingId) ?? null,
  );
  const target = listing ? spot(listing.id) : null;
  const player = { x: 92, y: 88 };

  return (
    <motion.div
      className="hud-panel pointer-events-none hidden w-[200px] p-2 lg:block"
      initial={{ opacity: 0, y: 20 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 1, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full rounded-[2px]">
        <rect width={WIDTH} height={HEIGHT} fill="#0b0e10" />
        {/* The bay. */}
        <path d="M150 0C138 22 162 44 148 70 140 88 156 104 150 118H184V0Z" fill="#0c2a2b" />
        {/* Side streets, then the boulevard. */}
        <g stroke="#ffffff" strokeOpacity=".13" strokeWidth="2">
          <path d="M-10 26 150 10M-10 58 150 42M-10 92 150 76M-10 124 150 108" />
          <path d="M22-6 38 124M62-6 78 124M118-6 134 124" />
        </g>
        <path d="M84-6 100 124" stroke="#ffffff" strokeOpacity=".34" strokeWidth="4.5" />
        {target && (
          <>
            <path
              d={`M${player.x} ${player.y}L${player.x - 2.4} ${target.y + 4}L${target.x} ${target.y}`}
              fill="none"
              stroke="#4ff2cf"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
            <circle cx={target.x} cy={target.y} r="9" fill="#4ff2cf" fillOpacity=".18">
              <animate attributeName="r" values="5;12;5" dur="2.2s" repeatCount="indefinite" />
              <animate
                attributeName="fill-opacity"
                values=".3;0;.3"
                dur="2.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={target.x}
              cy={target.y}
              r="3.4"
              fill="#4ff2cf"
              stroke="#0b0e10"
              strokeWidth="1.2"
            />
          </>
        )}
        {/* You. */}
        <path
          d={`M${player.x} ${player.y - 6}l5 11-5-3-5 3Z`}
          fill="#f3f5fa"
          stroke="#0b0e10"
          strokeWidth="1"
        />
        <text
          x={WIDTH - 9}
          y="13"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="#f3f5fa"
          fillOpacity=".7"
        >
          N
        </text>
      </svg>

      <div className="mt-1.5 grid grid-cols-2 gap-1">
        <div className="h-1.5 bg-white/15">
          <div className="h-full bg-[#f3f5fa]" style={{ width: '100%' }} />
        </div>
        <div className="h-1.5 bg-white/15">
          <div
            className="bg-accent h-full"
            style={{ width: `${((listing?.seller.rating ?? 0) / 5) * 100}%` }}
          />
        </div>
      </div>
      <div className="label mt-1 grid grid-cols-2 gap-1 text-[8px] text-white/50">
        <span>Escrow 100%</span>
        <span>{listing ? `Seller ${listing.seller.rating.toFixed(1)}` : 'Seller —'}</span>
      </div>
      <p className="label mt-1.5 truncate border-t border-white/[0.08] pt-1.5 text-[8.5px] text-white/60">
        {listing
          ? `Hand-off · ${formatDelivery(listing.deliveryMinutes)}`
          : 'Pick a product to plot the hand-off'}
      </p>
    </motion.div>
  );
}
