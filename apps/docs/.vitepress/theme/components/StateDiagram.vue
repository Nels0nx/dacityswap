<script setup lang="ts">
import type { EscrowState } from '@dacityswap/escrow-core';

/** The escrow state machine as a picture. `current` lights one state, `visited` marks the path. */
const props = defineProps<{ current?: EscrowState; visited?: readonly EscrowState[] }>();

const W = 132;
const H = 38;

const nodes: Record<EscrowState, { x: number; y: number; label: string }> = {
  awaiting_payment: { x: 78, y: 50, label: 'awaiting_payment' },
  funded: { x: 238, y: 50, label: 'funded' },
  in_delivery: { x: 398, y: 50, label: 'in_delivery' },
  delivered: { x: 558, y: 50, label: 'delivered' },
  completed: { x: 718, y: 50, label: 'completed' },
  disputed: { x: 478, y: 150, label: 'disputed' },
  cancelled: { x: 78, y: 250, label: 'cancelled' },
  refunded: { x: 318, y: 250, label: 'refunded' },
  split: { x: 618, y: 250, label: 'split' },
};

const FINAL: readonly EscrowState[] = ['completed', 'cancelled', 'refunded', 'split'];

/** Edges as SVG paths. `main` is the healthy path; a `quiet` one is legal but uncommon. */
const edges: { d: string; kind: 'main' | 'side' | 'quiet' }[] = [
  { d: 'M 144 50 H 166', kind: 'main' },
  { d: 'M 304 50 H 326', kind: 'main' },
  { d: 'M 464 50 H 486', kind: 'main' },
  { d: 'M 624 50 H 646', kind: 'main' },
  { d: 'M 78 69 V 225', kind: 'side' },
  { d: 'M 232 69 L 300 225', kind: 'side' },
  { d: 'M 384 69 L 334 225', kind: 'side' },
  { d: 'M 412 69 L 458 125', kind: 'side' },
  { d: 'M 546 69 L 500 125', kind: 'side' },
  { d: 'M 590 69 C 590 215, 480 250, 390 250', kind: 'quiet' },
  { d: 'M 544 144 L 692 74', kind: 'side' },
  { d: 'M 438 169 L 352 226', kind: 'side' },
  { d: 'M 518 169 L 596 226', kind: 'side' },
];

const tone = (state: EscrowState) => ({
  'is-current': props.current === state,
  'is-visited': props.visited?.includes(state) && props.current !== state,
  'is-final': FINAL.includes(state),
});
</script>

<template>
  <figure class="diagram">
    <svg viewBox="0 0 796 290" role="img" aria-label="The escrow state machine">
      <defs>
        <marker
          id="ds-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" class="arrow" />
        </marker>
        <marker
          id="ds-arrow-main"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" class="arrow arrow--main" />
        </marker>
      </defs>

      <path
        v-for="edge in edges"
        :key="edge.d"
        :d="edge.d"
        :class="['edge', `edge--${edge.kind}`]"
        :marker-end="edge.kind === 'main' ? 'url(#ds-arrow-main)' : 'url(#ds-arrow)'"
      />

      <g v-for="(node, state) in nodes" :key="state" :class="['node', tone(state)]">
        <rect :x="node.x - W / 2" :y="node.y - H / 2" :width="W" :height="H" rx="3" />
        <text :x="node.x" :y="node.y + 4">{{ node.label }}</text>
      </g>
    </svg>
    <figcaption>
      Solid mint: the path of a healthy trade. Dashed: a seller refunding after marking delivery,
      which is legal but uncommon.
    </figcaption>
  </figure>
</template>

<style scoped>
.diagram {
  margin: 1.25rem 0;
  overflow-x: auto;
}

svg {
  display: block;
  width: 100%;
  min-width: 600px;
  height: auto;
}

figcaption {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.edge {
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.2;
}

.edge--main {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.8;
}

.edge--quiet {
  stroke-dasharray: 4 4;
  opacity: 0.75;
}

.arrow {
  fill: var(--vp-c-text-3);
}

.arrow--main {
  fill: var(--vp-c-brand-1);
}

.node rect {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-border);
  stroke-width: 1.2;
  transition:
    fill 0.2s,
    stroke 0.2s;
}

.node text {
  fill: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  text-anchor: middle;
}

.node.is-final rect {
  stroke-dasharray: 3 3;
}

.node.is-visited rect {
  stroke: var(--vp-c-brand-1);
  stroke-dasharray: none;
}

.node.is-current rect {
  fill: var(--vp-c-brand-1);
  stroke: var(--vp-c-brand-1);
  stroke-dasharray: none;
}

.node.is-current text {
  fill: #04110e;
  font-weight: 700;
}

:root:not(.dark) .node.is-current text {
  fill: #ffffff;
}
</style>
