import { DacityApp } from '@/components/app/DacityApp';
import { marketRepository } from '@/server/market-repository';

export default async function Page() {
  // Server component: load the market once, hand it to the client app as its seed.
  const snapshot = await marketRepository.snapshot();
  return <DacityApp seed={snapshot} />;
}
