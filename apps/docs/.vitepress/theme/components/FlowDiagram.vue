<script setup lang="ts">
import { computed } from 'vue';
import { FLOWS } from '../diagrams/flows';
import type { FlowEdge, FlowNode, Side } from '../diagrams/types';

/** A box-and-arrow diagram, drawn from a description in ../diagrams/flows.ts. */
const props = defineProps<{ name: keyof typeof FLOWS }>();
const spec = computed(() => FLOWS[props.name]);
const uid = `flow-${String(props.name)}`;

type Point = readonly [number, number];

const byId = computed(() => new Map(spec.value.nodes.map((node) => [node.id, node])));

function anchor(node: FlowNode, side: Side, at = 0.5): Point {
  switch (side) {
    case 'l':
      return [node.x, node.y + node.h * at];
    case 'r':
      return [node.x + node.w, node.y + node.h * at];
    case 't':
      return [node.x + node.w * at, node.y];
    case 'b':
      return [node.x + node.w * at, node.y + node.h];
  }
}

/** The sides an edge uses when none are given: whichever pair faces the other node. */
function sides(a: FlowNode, b: FlowNode): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const separateX = b.x >= a.x + a.w || a.x >= b.x + b.w;
  const separateY = b.y >= a.y + a.h || a.y >= b.y + b.h;
  if (separateX && (!separateY || Math.abs(dx) >= Math.abs(dy))) {
    return dx > 0 ? ['r', 'l'] : ['l', 'r'];
  }
  return dy > 0 ? ['b', 't'] : ['t', 'b'];
}

const horizontal = (side: Side) => side === 'l' || side === 'r';

/** Corner points of an orthogonal route between two anchors. */
function route(p1: Point, s1: Side, p2: Point, s2: Side, via?: readonly Point[]): Point[] {
  if (via?.length) return [p1, ...via, p2];
  if (p1[0] === p2[0] || p1[1] === p2[1]) return [p1, p2];
  if (horizontal(s1) && horizontal(s2)) {
    const mid = (p1[0] + p2[0]) / 2;
    return [p1, [mid, p1[1]], [mid, p2[1]], p2];
  }
  if (!horizontal(s1) && !horizontal(s2)) {
    const mid = (p1[1] + p2[1]) / 2;
    return [p1, [p1[0], mid], [p2[0], mid], p2];
  }
  return horizontal(s1) ? [p1, [p2[0], p1[1]], p2] : [p1, [p1[0], p2[1]], p2];
}

/** The route as a path with rounded corners. */
function path(points: Point[], radius = 7): string {
  let d = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let index = 1; index < points.length - 1; index++) {
    const [px, py] = points[index - 1]!;
    const [cx, cy] = points[index]!;
    const [nx, ny] = points[index + 1]!;
    const into = Math.hypot(cx - px, cy - py);
    const out = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, into / 2, out / 2);
    const ax = cx - ((cx - px) / into) * r;
    const ay = cy - ((cy - py) / into) * r;
    const bx = cx + ((nx - cx) / out) * r;
    const by = cy + ((ny - cy) / out) * r;
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L ${last[0]} ${last[1]}`;
}

/** The point halfway along the route, where its label goes. */
function midpoint(points: Point[]): Point {
  const lengths = points.slice(1).map((point, index) => {
    const prev = points[index]!;
    return Math.hypot(point[0] - prev[0], point[1] - prev[1]);
  });
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (remaining <= length) {
      const [ax, ay] = points[index]!;
      const [bx, by] = points[index + 1]!;
      const t = length === 0 ? 0 : remaining / length;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    remaining -= length;
  }
  return points[points.length - 1]!;
}

/** The chip behind a label: monospace at 10 px is about 6.05 px a character. */
function labelBox(edge: { label?: string; lx: number; labelAnchor?: string }) {
  const w = (edge.label?.length ?? 0) * 6.05 + 10;
  const x =
    edge.labelAnchor === 'start'
      ? edge.lx - 5
      : edge.labelAnchor === 'end'
        ? edge.lx - w + 5
        : edge.lx - w / 2;
  return { x, w };
}

const edges = computed(() =>
  spec.value.edges.flatMap((edge: FlowEdge) => {
    const a = byId.value.get(edge.from);
    const b = byId.value.get(edge.to);
    if (!a || !b) return [];
    const [auto1, auto2] = sides(a, b);
    const s1 = edge.fromSide ?? auto1;
    const s2 = edge.toSide ?? auto2;
    const points = route(anchor(a, s1, edge.fromAt), s1, anchor(b, s2, edge.toAt), s2, edge.via);
    const label = edge.labelAt ?? midpoint(points);
    return [{ ...edge, d: path(points), label: edge.label, lx: label[0], ly: label[1] }];
  }),
);
</script>

<template>
  <figure class="ds-diagram">
    <div class="ds-diagram__scroll">
      <svg
        :viewBox="`0 0 ${spec.width} ${spec.height}`"
        :style="{ minWidth: `${Math.min(spec.width, 640)}px` }"
        role="img"
        :aria-label="spec.title"
      >
        <defs>
          <marker
            v-for="kind in ['main', 'side', 'dashed']"
            :id="`${uid}-${kind}`"
            :key="kind"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" :class="`tip tip--${kind}`" />
          </marker>
        </defs>

        <g
          v-for="group in spec.groups ?? []"
          :key="group.label"
          :class="['group', `group--${group.tone ?? 'muted'}`]"
        >
          <rect :x="group.x" :y="group.y" :width="group.w" :height="group.h" rx="6" />
          <text :x="group.x + 14" :y="group.y + 20">{{ group.label }}</text>
        </g>

        <path
          v-for="(edge, index) in edges"
          :key="`e${index}`"
          :d="edge.d"
          :class="['edge', `edge--${edge.kind ?? 'side'}`]"
          :marker-end="`url(#${uid}-${edge.kind ?? 'side'})`"
        />

        <g
          v-for="node in spec.nodes"
          :key="node.id"
          :class="['node', `node--${node.kind ?? 'node'}`]"
        >
          <rect :x="node.x" :y="node.y" :width="node.w" :height="node.h" rx="4" />
          <text
            :x="node.x + node.w / 2"
            :y="node.y + node.h / 2 + (node.sub ? -3 : 4)"
            class="node__title"
          >
            {{ node.title }}
          </text>
          <text
            v-if="node.sub"
            :x="node.x + node.w / 2"
            :y="node.y + node.h / 2 + 13"
            class="node__sub"
          >
            {{ node.sub }}
          </text>
        </g>

        <g
          v-for="(edge, index) in edges.filter((item) => item.label)"
          :key="`l${index}`"
          class="edge__label"
        >
          <rect
            :x="labelBox(edge).x"
            :y="edge.ly - 8"
            :width="labelBox(edge).w"
            height="16"
            rx="3"
          />

          <text :x="edge.lx" :y="edge.ly + 3.5" :text-anchor="edge.labelAnchor ?? 'middle'">
            {{ edge.label }}
          </text>
        </g>
      </svg>
    </div>
    <figcaption v-if="spec.caption">{{ spec.caption }}</figcaption>
  </figure>
</template>

<style scoped>
.group rect {
  fill: color-mix(in srgb, var(--vp-c-text-1) 2.5%, transparent);
  stroke: var(--vp-c-divider);
  stroke-dasharray: 4 4;
}

.group--brand rect {
  fill: var(--vp-c-brand-soft);
  stroke: color-mix(in srgb, var(--vp-c-brand-1) 45%, transparent);
}

.group text {
  fill: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.group--brand text {
  fill: var(--vp-c-brand-1);
}

.edge {
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.3;
}

.edge--main {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.8;
}

.edge--dashed {
  stroke-dasharray: 4 4;
}

.tip {
  fill: var(--vp-c-text-3);
}

.tip--main {
  fill: var(--vp-c-brand-1);
}

.edge__label rect {
  fill: var(--vp-c-bg);
}

.edge__label text {
  fill: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.node rect {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-border);
  stroke-width: 1.2;
}

.node__title {
  fill: var(--vp-c-text-1);
  font-size: 12.5px;
  font-weight: 600;
  text-anchor: middle;
}

.node__sub {
  fill: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  text-anchor: middle;
}

.node--core rect {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.6;
}

.node--core .node__title {
  fill: var(--vp-c-brand-1);
  font-size: 14px;
}

.node--state .node__title,
.node--final .node__title,
.node--start .node__title {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 500;
}

.node--final rect {
  stroke-dasharray: 3 3;
}

.node--start rect {
  fill: var(--vp-c-brand-1);
  stroke: var(--vp-c-brand-1);
}

.node--start .node__title {
  fill: #04110e;
  font-weight: 700;
}

:root:not(.dark) .node--start .node__title {
  fill: #ffffff;
}

.node--external rect {
  fill: transparent;
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 2 3;
}

.node--external .node__title {
  fill: var(--vp-c-text-2);
  font-weight: 500;
}

.node--planned rect {
  fill: transparent;
  stroke: var(--vp-c-border);
  stroke-dasharray: 6 4;
}

.node--planned .node__title {
  fill: var(--vp-c-text-2);
}
</style>
