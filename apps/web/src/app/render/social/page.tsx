import type { Metadata } from 'next';
import { SocialStage } from '@/components/social/SocialStage';

/** Internal tool: renders brand and social images (`?piece=banner`). See scripts/render-social.mjs. */
export const metadata: Metadata = {
  title: 'Social render',
  robots: { index: false, follow: false },
};

export default function SocialRenderPage() {
  return <SocialStage />;
}
