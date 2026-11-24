import { NextResponse } from 'next/server';

import { authorizeCron, sendReminders } from '@/composition';

export const runtime = 'nodejs';

const CAMPAIGNS = ['kit-pickup', 'race-day'];

/**
 * Sends a reminder campaign. Whatever schedules it must send the bearer secret.
 *
 * @remarks
 * A repeated call sends nothing new, because each email has an idempotency key.
 */
export async function GET(request: Request): Promise<Response> {
  if (!authorizeCron(request)) return new Response(null, { status: 404 });

  const campaign = new URL(request.url).searchParams.get('campaign') ?? '';
  if (!CAMPAIGNS.includes(campaign)) return new Response(null, { status: 400 });

  return NextResponse.json(await sendReminders(campaign));
}
