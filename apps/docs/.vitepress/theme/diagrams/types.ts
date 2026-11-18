/**
 * The data behind every diagram on the site. A diagram is a description, not a drawing: the
 * renderers in ../components turn it into SVG with one consistent look, in both colour modes.
 */

export type Side = 'l' | 'r' | 't' | 'b';

export interface FlowNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly title: string;
  /** A second, quieter line: a path, a type, a status. */
  readonly sub?: string;
  /**
   * core: the escrow itself · node: a component · state: an escrow state (monospace) ·
   * final: a final state · external: something outside DacitySwap · planned: not built yet
   */
  readonly kind?: 'core' | 'node' | 'state' | 'final' | 'external' | 'planned' | 'start';
}

export interface FlowEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  /** main: the healthy path · side: a legal alternative · dashed: async, optional or a timeout */
  readonly kind?: 'main' | 'side' | 'dashed';
  readonly fromSide?: Side;
  readonly toSide?: Side;
  /** Where along the side the edge leaves or arrives, 0–1. Default 0.5. */
  readonly fromAt?: number;
  readonly toAt?: number;
  /** Extra corner points, for a route the automatic elbow cannot find. */
  readonly via?: readonly (readonly [number, number])[];
  /** Where the label sits, if not at the middle of the route. */
  readonly labelAt?: readonly [number, number];
  readonly labelAnchor?: 'start' | 'middle' | 'end';
}

export interface FlowGroup {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly tone?: 'brand' | 'muted';
}

export interface FlowDiagramSpec {
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly groups?: readonly FlowGroup[];
  readonly caption?: string;
}

export interface SequenceActor {
  readonly id: string;
  readonly title: string;
  readonly sub?: string;
  readonly kind?: 'core' | 'node' | 'external';
}

export type SequenceStep =
  | {
      readonly from: string;
      readonly to: string;
      readonly label: string;
      /** call: a request · reply: an answer · key: a move of the escrow · event: a notification */
      readonly kind?: 'call' | 'reply' | 'key' | 'event';
    }
  | { readonly note: string; readonly over: readonly string[] }
  | { readonly frame: 'start'; readonly label: string; readonly kind?: 'alt' | 'loop' | 'opt' }
  | { readonly frame: 'else'; readonly label: string }
  | { readonly frame: 'end' };

export interface SequenceDiagramSpec {
  readonly title: string;
  readonly actors: readonly SequenceActor[];
  readonly steps: readonly SequenceStep[];
  readonly caption?: string;
}
