import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

export function GET() {
  return NextResponse.json({ status: 'ok', mode: siteConfig.demoMode ? 'demo' : 'live' });
}
