import 'server-only';

import { cache } from 'react';

import { getAccountRunners, getAdminUser, getEventSettings, getSignedInUser } from '@/composition';
import { isPaymentOpen } from '@/modules/event';
import { toMenuAccount } from '@/modules/payments/presentation/menu-account';

/**
 * Reads the visitor's session once per request for the header: whether they are an admin
 * and, when signed in, the account as the menus show it.
 */
export const loadHeaderSession = cache(async () => {
  const [user, admin] = await Promise.all([getSignedInUser(), getAdminUser()]);
  if (!user.ok) return { isAdmin: admin.ok, account: null };

  const [runners, settings] = await Promise.all([
    getAccountRunners(user.value.id),
    getEventSettings(),
  ]);
  return {
    isAdmin: admin.ok,
    account: toMenuAccount(user.value.name, runners, isPaymentOpen(settings)),
  };
});
