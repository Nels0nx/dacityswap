'use client';

import { useRef, type PointerEvent, type WheelEvent } from 'react';
import { stageInput } from '@/store/scene-store';

const YAW_PER_PIXEL = 0.009;
const PITCH_PER_PIXEL = 0.004;

/**
 * An invisible surface over the scene. Dragging on it turns the product on stage and the wheel
 * zooms it. It sits under every panel, so the interface keeps its own clicks.
 */
export function StageDragArea() {
  const last = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    stageInput.dragging = true;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    stageInput.yawDelta += (event.clientX - last.current.x) * YAW_PER_PIXEL;
    stageInput.pitch += (event.clientY - last.current.y) * PITCH_PER_PIXEL;
    stageInput.pitch = Math.min(0.6, Math.max(-0.6, stageInput.pitch));
    last.current = { x: event.clientX, y: event.clientY };
  };

  const end = () => {
    last.current = null;
    stageInput.dragging = false;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    stageInput.zoom = Math.min(
      1.5,
      Math.max(0.7, stageInput.zoom * Math.exp(-event.deltaY * 0.0012)),
    );
  };

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onWheel={onWheel}
    />
  );
}
