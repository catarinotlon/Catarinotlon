import { getAdminUser, getSignedInUser } from '@/composition';
import { LandingNav } from '@/modules/event/presentation';

/**
 * The landing page's navigation for every other page: its section links lead back to the
 * landing page, and the narrow-screen menu follows the session.
 *
 * @returns The site navigation.
 */
export async function SiteNavigation() {
  const [user, admin] = await Promise.all([getSignedInUser(), getAdminUser()]);
  return <LandingNav onLanding={false} signedIn={user.ok} isAdmin={admin.ok} />;
}
