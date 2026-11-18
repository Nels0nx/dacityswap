<script setup lang="ts">
import { computed } from 'vue';
import { SEQUENCES } from '../diagrams/sequences';

/** A sequence diagram, drawn from a description in ../diagrams/sequences.ts. */
const props = defineProps<{ name: keyof typeof SEQUENCES }>();
const spec = computed(() => SEQUENCES[props.name]);
const uid = `seq-${String(props.name)}`;

const HEAD = 46;
const COLUMN = 168;
const ROW = { message: 42, self: 50, note: 40, start: 34, else: 30, end: 16 } as const;

interface Arrow {
  type: 'arrow';
  x1: number;
  x2: number;
  y: number;
  label: string;
  kind: string;
  self: boolean;
}
interface Note {
  type: 'note';
  x: number;
  w: number;
  y: number;
  text: string;
}
interface Frame {
  y1: number;
  y2: number;
  label: string;
  kind: string;
  splits: { y: number; label: string }[];
}

const layout = computed(() => {
  const actors = spec.value.actors;
  const width = Math.max(720, actors.length * COLUMN);
  const step = (width - COLUMN) / Math.max(1, actors.length - 1);
  const x = new Map(actors.map((actor, index) => [actor.id, COLUMN / 2 + index * step]));

  const items: (Arrow | Note)[] = [];
  const frames: Frame[] = [];
  const open: Frame[] = [];
  let y = HEAD + 22;

  for (const step of spec.value.steps) {
    if ('frame' in step) {
      if (step.frame === 'start') {
        const frame: Frame = {
          y1: y,
          y2: y,
          label: step.label,
          kind: step.kind ?? 'alt',
          splits: [],
        };
        open.push(frame);
        frames.push(frame);
        y += ROW.start;
      } else if (step.frame === 'else') {
        open[open.length - 1]?.splits.push({ y: y + 4, label: step.label });
        y += ROW.else;
      } else {
        const frame = open.pop();
        if (frame) frame.y2 = y;
        y += ROW.end;
      }
    } else if ('note' in step) {
      const xs = step.over.map((id) => x.get(id) ?? 0);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const w = Math.max(150, right - left + 120, step.note.length * 6.4 + 28);
      const nx = Math.min(Math.max(6, (left + right) / 2 - w / 2), width - 6 - w);
      items.push({ type: 'note', x: nx, w, y: y - 4, text: step.note });
      y += ROW.note;
    } else {
      const self = step.from === step.to;
      y += self ? 8 : 10;
      items.push({
        type: 'arrow',
        x1: x.get(step.from) ?? 0,
        x2: x.get(step.to) ?? 0,
        y,
        label: step.label,
        kind: step.kind ?? 'call',
        self,
      });
      y += (self ? ROW.self : ROW.message) - (self ? 8 : 10);
    }
  }

  return { width, height: y + 18, x, items, frames, step };
});

function arrowPath(item: Arrow): string {
  if (item.self) {
    return `M ${item.x1} ${item.y} h 34 q 6 0 6 6 v 12 q 0 6 -6 6 h -32`;
  }
  const direction = item.x2 > item.x1 ? 1 : -1;
  return `M ${item.x1 + direction * 3} ${item.y} H ${item.x2 - direction * 4}`;
}
</script>

<template>
  <figure class="ds-diagram">
    <div class="ds-diagram__scroll">
      <svg
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        :style="{ minWidth: `${Math.min(layout.width, 680)}px` }"
        role="img"
        :aria-label="spec.title"
      >
        <defs>
          <marker
            v-for="kind in ['call', 'reply', 'key', 'event']"
            :id="`${uid}-${kind}`"
            :key="kind"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              :d="kind === 'reply' ? 'M 1 1 L 9 5 L 1 9' : 'M 0 1 L 9 5 L 0 9 z'"
              :class="`tip tip--${kind}`"
            />
          </marker>
        </defs>

        <!-- Frames sit behind everything. -->
        <g v-for="(frame, index) in layout.frames" :key="`f${index}`" class="frame">
          <rect
            x="6"
            :y="frame.y1"
            :width="layout.width - 12"
            :height="frame.y2 - frame.y1"
            rx="5"
          />
          <path :d="`M 6 ${frame.y1 + 22} H 64 l 10 -10 V ${frame.y1}`" class="frame__tab" />
          <text x="14" :y="frame.y1 + 15" class="frame__kind">{{ frame.kind }}</text>
          <text x="86" :y="frame.y1 + 15" class="frame__label">{{ frame.label }}</text>
          <g v-for="split in frame.splits" :key="split.y">
            <line x1="6" :x2="layout.width - 6" :y1="split.y" :y2="split.y" class="frame__split" />
            <text x="14" :y="split.y + 15" class="frame__label">{{ split.label }}</text>
          </g>
        </g>

        <!-- Lifelines and heads. -->
        <g
          v-for="actor in spec.actors"
          :key="actor.id"
          :class="['actor', `actor--${actor.kind ?? 'node'}`]"
        >
          <line
            :x1="layout.x.get(actor.id)"
            :x2="layout.x.get(actor.id)"
            :y1="HEAD"
            :y2="layout.height - 8"
            class="lifeline"
          />
          <rect :x="(layout.x.get(actor.id) ?? 0) - 72" y="0" width="144" :height="HEAD" rx="4" />
          <text :x="layout.x.get(actor.id)" :y="actor.sub ? 19 : 27" class="actor__title">
            {{ actor.title }}
          </text>
          <text v-if="actor.sub" :x="layout.x.get(actor.id)" y="34" class="actor__sub">
            {{ actor.sub }}
          </text>
        </g>

        <template v-for="(item, index) in layout.items" :key="`i${index}`">
          <g v-if="item.type === 'note'" class="note">
            <rect :x="item.x" :y="item.y - 13" :width="item.w" height="26" rx="3" />
            <text :x="item.x + item.w / 2" :y="item.y + 4">{{ item.text }}</text>
          </g>
          <g v-else :class="['msg', `msg--${item.kind}`]">
            <path :d="arrowPath(item)" :marker-end="`url(#${uid}-${item.kind})`" />
            <text
              :x="item.self ? item.x1 + 48 : (item.x1 + item.x2) / 2"
              :y="item.self ? item.y + 14 : item.y - 8"
              :text-anchor="item.self ? 'start' : 'middle'"
            >
              {{ item.label }}
            </text>
          </g>
        </template>
      </svg>
    </div>
    <figcaption v-if="spec.caption">{{ spec.caption }}</figcaption>
  </figure>
</template>

<style scoped>
.lifeline {
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
  stroke-dasharray: 3 4;
}

.actor rect {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-border);
  stroke-width: 1.2;
}

.actor--core rect {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
}

.actor--external rect {
  fill: transparent;
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 2 3;
}

.actor__title {
  fill: var(--vp-c-text-1);
  font-size: 12.5px;
  font-weight: 600;
  text-anchor: middle;
}

.actor--core .actor__title {
  fill: var(--vp-c-brand-1);
}

.actor__sub {
  fill: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  text-anchor: middle;
}

.msg path {
  fill: none;
  stroke: var(--vp-c-text-2);
  stroke-width: 1.3;
}

.msg--reply path {
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 4 3;
}

.msg--key path {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.7;
}

.msg--event path {
  stroke: var(--vp-c-text-3);
}

.msg text {
  fill: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  paint-order: stroke;
  stroke: var(--vp-c-bg);
  stroke-width: 5px;
  stroke-linejoin: round;
}

.msg--reply text,
.msg--event text {
  fill: var(--vp-c-text-2);
}

.tip--call {
  fill: var(--vp-c-text-2);
}

.tip--reply {
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.3;
}

.tip--key {
  fill: var(--vp-c-brand-1);
}

.tip--event {
  fill: var(--vp-c-text-3);
}

.note rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-border);
}

.note text {
  fill: var(--vp-c-text-2);
  font-size: 11px;
  text-anchor: middle;
}

.frame rect {
  fill: color-mix(in srgb, var(--vp-c-text-1) 2%, transparent);
  stroke: var(--vp-c-border);
}

.frame__tab {
  fill: none;
  stroke: var(--vp-c-border);
}

.frame__kind {
  fill: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.frame__label {
  fill: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.frame__split {
  stroke: var(--vp-c-border);
  stroke-dasharray: 4 4;
}
</style>
