import { and, asc, eq, isNull } from 'drizzle-orm';

import { err, ok, type Result } from '@/shared/domain/result';
import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import * as schema from '@/shared/infrastructure/db/schema';

import type {
  BibNumberTaken,
  RegistrationRepository,
} from '../application/ports/registration-repository';
import type { BibNumber } from '../domain/bib-number';
import type { Registration } from '../domain/registration';
import type { ShirtName } from '../domain/shirt-name';

const { registrations } = schema;

type RegistrationRow = typeof registrations.$inferSelect;

function toEntity(row: RegistrationRow): Registration {
  return {
    id: row.id,
    ownerId: row.ownerId,
    runnerName: row.runnerName,
    distance: row.distance,
    shirtSize: row.shirtSize,
    shirtName: row.shirtName as ShirtName,
    bibNumber: row.bibNumber as BibNumber,
    feeCents: row.feeCents,
    locale: row.locale,
    createdAt: row.createdAt,
    status: row.status,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
  };
}

function isBibCollision(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  const messages = [error, cause].map((item) => (item instanceof Error ? item.message : ''));
  return messages.some((message) => message.includes('registrations.bib_number'));
}

/** Drizzle adapter of the {@link RegistrationRepository} port. */
export class DrizzleRegistrationRepository implements RegistrationRepository {
  /**
   * Creates the repository.
   *
   * @param db - The Drizzle client.
   */
  constructor(private readonly db: DatabaseClient) {}

  async insert(registration: Registration): Promise<Result<void, BibNumberTaken>> {
    try {
      await this.db.insert(registrations).values(registration);
      return ok(undefined);
    } catch (error) {
      if (isBibCollision(error)) return err('registration.bib_number_taken');
      throw error;
    }
  }

  async findById(id: string): Promise<Registration | null> {
    const [row] = await this.db
      .select()
      .from(registrations)
      .where(and(eq(registrations.id, id), isNull(registrations.deletedAt)));
    return row ? toEntity(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Registration[]> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(and(eq(registrations.ownerId, ownerId), isNull(registrations.deletedAt)))
      .orderBy(asc(registrations.createdAt));
    return rows.map(toEntity);
  }

  async listAll(): Promise<Registration[]> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(isNull(registrations.deletedAt))
      .orderBy(asc(registrations.createdAt));
    return rows.map(toEntity);
  }

  async update(registration: Registration): Promise<void> {
    await this.db
      .update(registrations)
      .set({
        runnerName: registration.runnerName,
        distance: registration.distance,
        shirtSize: registration.shirtSize,
        shirtName: registration.shirtName,
        status: registration.status,
        locale: registration.locale,
        contactEmail: registration.contactEmail,
        contactPhone: registration.contactPhone,
      })
      .where(and(eq(registrations.id, registration.id), isNull(registrations.deletedAt)));
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db
      .update(registrations)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(registrations.id, id), isNull(registrations.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    await this.db
      .update(registrations)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(registrations.id, id));
  }
}
