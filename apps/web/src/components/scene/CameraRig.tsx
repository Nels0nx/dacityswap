'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/store/scene-store';
import {
  CAMERA_LOOK_AT,
  CAMERA_REST,
  CAMERA_START,
  DESKTOP_BREAKPOINT,
  DOCK_LIFT,
  SIDE_WIDTH,
} from './constants';

const INTRO_SECONDS = 3;
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const phase = useSceneStore((state) => state.phase);
  const stageModel = useSceneStore((state) => state.stageModel);
  const lastModel = useRef(stageModel);
  const push = useRef(0);
  const progress = useRef(0);
  const pointer = useRef(new THREE.Vector2());
  const desired = useRef(new THREE.Vector3());

  // Track the pointer on the window: the UI sits above the canvas and would swallow its events.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Shift the projection so the vanishing point is centred in the area the ticket leaves free.
  useEffect(() => {
    if (size.width >= DESKTOP_BREAKPOINT) {
      camera.setViewOffset(
        size.width,
        size.height,
        SIDE_WIDTH / 2,
        DOCK_LIFT,
        size.width,
        size.height,
      );
    } else {
      // On small screens the panel covers the lower part instead; lift the horizon above it.
      camera.setViewOffset(size.width, size.height, 0, size.height * 0.08, size.width, size.height);
    }
    return () => camera.clearViewOffset();
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (phase !== 'loading') {
      progress.current = reducedMotion ? 1 : Math.min(1, progress.current + dt / INTRO_SECONDS);
    }
    const eased = easeOutQuart(progress.current);

    desired.current.lerpVectors(CAMERA_START, CAMERA_REST, eased);
    if (!reducedMotion) {
      desired.current.x += pointer.current.x * 0.3 * eased;
      desired.current.y += pointer.current.y * 0.1 * eased;
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.current.x, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.current.y, 3, dt);
    // Each new product gets a short push-in that eases back out, like a camera operator reframing.
    if (lastModel.current !== stageModel) {
      lastModel.current = stageModel;
      if (!reducedMotion) push.current = 1;
    }
    push.current = THREE.MathUtils.damp(push.current, 0, 2.2, dt);
    camera.position.z = desired.current.z - push.current * 0.7;
    camera.lookAt(CAMERA_LOOK_AT);
  });

  return null;
}
