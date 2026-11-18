'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import { useSceneStore } from '@/store/scene-store';

// three.js needs a browser; load the scene on the client only and out of the main bundle.
const Scene = dynamic(() => import('./Scene'), { ssr: false });

/** If WebGL is unavailable the CSS sunset behind the canvas takes over and the app still works. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    useSceneStore.getState().markSceneReady();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SceneCanvas() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className="scene-fallback absolute inset-0" />
      <div className="absolute inset-0">
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      </div>
    </div>
  );
}
