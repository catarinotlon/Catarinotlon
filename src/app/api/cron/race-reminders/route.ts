import { NextResponse } from 'next/server';

import { authorizeCron, sendReminders } from '@/composition';

export const runtime = 'nodejs';

/**
 * Sends today's race reminder, if any. Vercel calls it once a day (see
 * `vercel.json`) with the bearer secret.
 *
 * @remarks
 * Reminders go out three days and one day before the race date the organizer
 * set. A repeated call sends nothing new, because each email has an
 * idempotency key.
 */
export async function GET(request: Request): Promise<Response> {
  if (!authorizeCron(request)) return new Response(null, { status: 404 });

  return NextResponse.json(await sendReminders());
}
