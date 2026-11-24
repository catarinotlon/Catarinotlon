import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/shared/infrastructure/db/database-client';
import { accountProfiles, legalAcceptances, user } from '@/shared/infrastructure/db/schema';

const DEFAULT_LOCALE = 'es';

/** Contact data of an account holder. */
export interface AccountHolderContact {
  /** The holder's full name. */
  readonly name: string;
  /** The holder's email. */
  readonly email: string;
  /** The holder's preferred locale. */
  readonly locale: string;
}

/** Reads and saves account holders' contact data and legal acceptances. */
export class DrizzleAccountDirectory {
  /**
   * Creates the directory.
   *
   * @param db - The database, because saving details opens a transaction.
   */
  constructor(private readonly db: AppDatabase) {}

  /**
   * Finds an account holder's contact data.
   *
   * @param userId - The account's user ID.
   * @returns The contact, or `null` for an unknown account.
   */
  async accountHolder(userId: string): Promise<AccountHolderContact | null> {
    const [row] = await this.db
      .select({ name: user.name, email: user.email, locale: accountProfiles.locale })
      .from(user)
      .leftJoin(accountProfiles, eq(accountProfiles.userId, user.id))
      .where(and(eq(user.id, userId), isNull(user.deletedAt)));
    return row ? { name: row.name, email: row.email, locale: row.locale ?? DEFAULT_LOCALE } : null;
  }

  /**
   * Finds an account's email address.
   *
   * @param userId - The account's user ID.
   * @returns The address, or `null`.
   */
  async emailOf(userId: string): Promise<string | null> {
    return (await this.accountHolder(userId))?.email ?? null;
  }

  /**
   * Maps every active account to its email, for the admin table.
   *
   * @returns The emails, by user ID.
   */
  async emailsByUser(): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(isNull(user.deletedAt));
    return new Map(rows.map((row) => [row.id, row.email]));
  }

  /**
   * Finds an account holder's phone.
   *
   * @param userId - The account's user ID.
   * @returns The phone, or `null`.
   */
  async phoneOf(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ phone: accountProfiles.phone })
      .from(accountProfiles)
      .where(and(eq(accountProfiles.userId, userId), isNull(accountProfiles.deletedAt)));
    return row?.phone ?? null;
  }

  /**
   * Creates or updates an account holder's profile.
   *
   * @param input - The user, the phone, the locale, and the time.
   */
  async saveProfile(input: {
    readonly userId: string;
    readonly phone: string | null;
    readonly locale: string;
    readonly at: Date;
  }): Promise<void> {
    await this.db
      .insert(accountProfiles)
      .values({
        userId: input.userId,
        phone: input.phone,
        locale: input.locale,
        updatedAt: input.at,
      })
      .onConflictDoUpdate({
        target: accountProfiles.userId,
        set: { phone: input.phone, locale: input.locale, updatedAt: input.at },
      });
  }

  /**
   * Saves the account holder's editable details.
   *
   * @remarks
   * The name and the phone live in different tables, so they change together or
   * not at all.
   *
   * @param input - The account, its new name and phone, the locale, and the time.
   */
  async updateDetails(input: {
    readonly userId: string;
    readonly name: string;
    readonly phone: string;
    readonly locale: string;
    readonly at: Date;
  }): Promise<void> {
    const { userId, name, phone, locale, at } = input;
    await this.db.transaction(async (tx) => {
      await tx.update(user).set({ name, updatedAt: at }).where(eq(user.id, userId));
      await tx
        .insert(accountProfiles)
        .values({ userId, phone, locale, updatedAt: at })
        .onConflictDoUpdate({
          target: accountProfiles.userId,
          set: { phone, locale, updatedAt: at },
        });
    });
  }

  /**
   * Records which versions of the legal documents a user accepted.
   *
   * @param input - The record's UUID, the user, the versions, and the time.
   */
  async recordLegalAcceptance(input: {
    readonly id: string;
    readonly userId: string;
    readonly privacyVersion: string;
    readonly termsVersion: string;
    readonly at: Date;
  }): Promise<void> {
    await this.db.insert(legalAcceptances).values({
      id: input.id,
      userId: input.userId,
      privacyVersion: input.privacyVersion,
      termsVersion: input.termsVersion,
      acceptedAt: input.at,
    });
  }
}
