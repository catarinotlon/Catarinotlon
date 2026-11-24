import { err, ok, type Result } from '@/shared/domain/result';

import type {
  BibNumberTaken,
  RegistrationRepository,
} from '../application/ports/registration-repository';
import type { Registration } from '../domain/registration';

interface StoredRow {
  registration: Registration;
  deletedBy: string | null;
  deleted: boolean;
}

/** In-memory {@link RegistrationRepository} double for tests. */
export class InMemoryRegistrationRepository implements RegistrationRepository {
  private readonly rows = new Map<string, StoredRow>();

  async insert(registration: Registration): Promise<Result<void, BibNumberTaken>> {
    const taken = [...this.rows.values()].some(
      (row) => row.registration.bibNumber === registration.bibNumber,
    );
    if (taken) return err('registration.bib_number_taken');

    this.rows.set(registration.id, { registration, deletedBy: null, deleted: false });
    return ok(undefined);
  }

  async findById(id: string): Promise<Registration | null> {
    const row = this.rows.get(id);
    return row && !row.deleted ? row.registration : null;
  }

  async listByOwner(ownerId: string): Promise<Registration[]> {
    return [...this.rows.values()]
      .filter((row) => !row.deleted && row.registration.ownerId === ownerId)
      .map((row) => row.registration)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listAll(): Promise<Registration[]> {
    return [...this.rows.values()]
      .filter((row) => !row.deleted)
      .map((row) => row.registration)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async update(registration: Registration): Promise<void> {
    const row = this.rows.get(registration.id);
    if (row && !row.deleted) row.registration = registration;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.deleted = true;
      row.deletedBy = deletedBy;
    }
  }

  async restore(id: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.deleted = false;
      row.deletedBy = null;
    }
  }

  /**
   * Reports whether a row is physically stored, including soft-deleted ones.
   *
   * @param id - The registration's UUID.
   * @returns `true` when the row exists.
   */
  hasStoredRow(id: string): boolean {
    return this.rows.has(id);
  }
}
