import type { Metadata } from 'next';
import { RenderStage } from '@/components/scene/RenderStage';

/** Internal tool: renders one asset on a transparent background for thumbnails and stickers. */
export const metadata: Metadata = {
  title: 'Asset render',
  robots: { index: false, follow: false },
};

export default function RenderPage() {
  return <RenderStage />;
}
