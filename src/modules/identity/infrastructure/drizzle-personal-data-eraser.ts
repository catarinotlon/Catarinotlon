import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { AppDatabase, DatabaseClient } from '@/shared/infrastructure/db/database-client';
import {
  account,
  accountProfiles,
  erasureRecords,
  kitPickups,
  payments,
  registrationChanges,
  registrationErasureRecords,
  registrations,
  session,
  user,
} from '@/shared/infrastructure/db/schema';

import type {
  ErasureRequest,
  ManualRegistrationEraser,
  PersonalDataEraser,
  RegistrationErasureRequest,
} from '../application/ports/personal-data-eraser';

const PERSONAL_AUDIT_FIELDS = ['runnerName', 'shirtName'];

async function anonymizeRegistrations(
  tx: DatabaseClient,
  registrationIds: readonly string[],
): Promise<void> {
  if (registrationIds.length === 0) return;

  await tx
    .update(registrations)
    .set({
      runnerName: 'Erased runner',
      shirtName: 'ERASED',
      contactEmail: null,
      contactPhone: null,
    })
    .where(inArray(registrations.id, [...registrationIds]));

  await tx
    .update(registrationChanges)
    .set({ previousValue: null, newValue: null })
    .where(
      and(
        inArray(registrationChanges.registrationId, [...registrationIds]),
        inArray(registrationChanges.field, PERSONAL_AUDIT_FIELDS),
      ),
    );

  await tx
    .update(kitPickups)
    .set({ collectedBy: null })
    .where(inArray(kitPickups.registrationId, [...registrationIds]));
}

/** Drizzle adapter of the erasure ports. */
export class DrizzlePersonalDataEraser implements PersonalDataEraser, ManualRegistrationEraser {
  /**
   * Creates the eraser.
   *
   * @param db - The database. The erasure runs in its own transaction.
   */
  constructor(private readonly db: AppDatabase) {}

  async erase(request: ErasureRequest): Promise<void> {
    const { userId, at } = request;

    await this.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          name: 'Erased user',
          email: `erased-${userId}@erased.invalid`,
          emailVerified: false,
          image: null,
        })
        .where(eq(user.id, userId));

      await tx
        .update(account)
        .set({
          accountId: sql`'erased-' || ${account.id}`,
          password: null,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
        })
        .where(eq(account.userId, userId));

      await tx.update(session).set({ expiresAt: at }).where(eq(session.userId, userId));

      await tx
        .update(accountProfiles)
        .set({ phone: null, updatedAt: at })
        .where(eq(accountProfiles.userId, userId));

      const owned = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(eq(registrations.ownerId, userId));
      await anonymizeRegistrations(
        tx,
        owned.map((row) => row.id),
      );

      await tx
        .update(payments)
        .set({ concept: 'CATARINOTLON - ERASED' })
        .where(eq(payments.ownerId, userId));

      await tx.insert(erasureRecords).values({
        id: request.recordId,
        userId,
        performedBy: request.performedBy,
        performedAt: at,
      });
    });
  }

  /**
   * Erases a registration that has no account.
   *
   * @param request - The erasure to carry out.
   * @returns `false`, changing nothing, when it is unknown or belongs to an account.
   */
  async eraseManual(request: RegistrationErasureRequest): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(and(eq(registrations.id, request.registrationId), isNull(registrations.ownerId)));
      if (!target) return false;

      await anonymizeRegistrations(tx, [target.id]);
      await tx.insert(registrationErasureRecords).values({
        id: request.recordId,
        registrationId: target.id,
        performedBy: request.performedBy,
        performedAt: request.at,
      });
      return true;
    });
  }
}
