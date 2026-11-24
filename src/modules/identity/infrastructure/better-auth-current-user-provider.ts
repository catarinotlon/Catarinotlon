import type { CurrentUser, CurrentUserProvider } from '../application/ports/current-user-provider';

/** The part of a Better Auth session this adapter reads. */
export interface SessionLike {
  /** The signed-in user. */
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly emailVerified: boolean;
  };
}

/** {@link CurrentUserProvider} adapter that reads the Better Auth session. */
export class BetterAuthCurrentUserProvider implements CurrentUserProvider {
  /**
   * Creates the provider.
   *
   * @param getSession - Better Auth's session reader.
   * @param getHeaders - Reads the current request's headers.
   */
  constructor(
    private readonly getSession: (input: { headers: Headers }) => Promise<SessionLike | null>,
    private readonly getHeaders: () => Promise<Headers>,
  ) {}

  async current(): Promise<CurrentUser | null> {
    const session = await this.getSession({ headers: await this.getHeaders() });
    if (!session) return null;

    const { id, name, email, emailVerified } = session.user;
    return { id, name, email, emailVerified };
  }
}
