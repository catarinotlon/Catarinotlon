import { expect, fn, waitFor } from 'storybook/test';

/** A stand-in for Cloudflare's `window.turnstile`, so stories never load the real script. */
export interface FakeTurnstile {
  /**
   * Renders a widget and returns its ID, `widget-1`. Like the real script, it adds
   * the empty `cf-turnstile-response` field to the container.
   */
  readonly render: ReturnType<
    typeof fn<(container: HTMLElement, options: Record<string, unknown>) => string>
  >;
  /** Starts a fresh challenge, which clears the token. */
  readonly reset: ReturnType<typeof fn<(widgetId: string) => void>>;
  /** Removes a widget. */
  readonly remove: ReturnType<typeof fn<(widgetId: string) => void>>;
  /** The current token, or `undefined` while there is none. */
  readonly getResponse: ReturnType<typeof fn<(widgetId: string) => string | undefined>>;
  /** Whether the current token has expired. */
  readonly isExpired: ReturnType<typeof fn<(widgetId: string) => boolean>>;
}

const RESPONSE_FIELD = 'cf-turnstile-response';

interface WidgetState {
  container: HTMLElement | null;
  options: Record<string, unknown>;
  token: string | undefined;
  expired: boolean;
}

let state: WidgetState = { container: null, options: {}, token: undefined, expired: false };

/** The fake the current story installed. */
export let fakeTurnstile: FakeTurnstile = createFake();

function responseField(): HTMLInputElement | null {
  return (
    state.container?.querySelector<HTMLInputElement>(`input[name="${RESPONSE_FIELD}"]`) ?? null
  );
}

function setToken(token: string | undefined) {
  state.token = token;
  state.expired = false;
  const field = responseField();
  if (field) field.value = token ?? '';
}

function createFake(): FakeTurnstile {
  state = { container: null, options: {}, token: undefined, expired: false };
  return {
    render: fn((container: HTMLElement, options: Record<string, unknown>) => {
      state = { container, options, token: undefined, expired: false };
      const field = document.createElement('input');
      field.type = 'hidden';
      field.name = RESPONSE_FIELD;
      container.append(field);
      return 'widget-1';
    }),
    reset: fn((_widgetId: string) => setToken(undefined)),
    remove: fn((_widgetId: string) => undefined),
    getResponse: fn((_widgetId: string) => state.token),
    isExpired: fn((_widgetId: string) => state.expired),
  };
}

function callback(name: string): (...args: unknown[]) => unknown {
  const handler = state.options[name];
  if (typeof handler !== 'function') throw new Error(`The widget has no ${name}`);
  return handler as (...args: unknown[]) => unknown;
}

/**
 * Installs a fresh fake as `window.turnstile`. Use it as a story's `beforeEach`.
 *
 * @returns The cleanup that removes it.
 */
export function installFakeTurnstile(): () => void {
  fakeTurnstile = createFake();
  Object.assign(window, { turnstile: fakeTurnstile });
  return () => {
    Reflect.deleteProperty(window, 'turnstile');
  };
}

/**
 * Waits for the widget and returns the element Turnstile was asked to render into.
 *
 * @returns The widget's container.
 */
export async function renderedWidget(): Promise<HTMLElement> {
  await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalled());
  return fakeTurnstile.render.mock.calls.at(-1)![0];
}

/**
 * Cloudflare confirms the visitor: the token fills the form field and `callback` runs.
 *
 * @param token - The token to hand out.
 */
export function solveHumanCheck(token = 'story-token'): void {
  setToken(token);
  callback('callback')(token);
}

/** The token outlives its five minutes, as when a phone pauses the tab. */
export function expireHumanCheck(): void {
  state.expired = true;
}

/**
 * Cloudflare cannot finish the challenge and reports an error code.
 *
 * @param code - The client-side error code, for example `600010`.
 */
export function failHumanCheck(code = '600010'): void {
  setToken(undefined);
  callback('error-callback')(code);
}

/** Cloudflare does not support the visitor's browser. */
export function rejectBrowser(): void {
  callback('unsupported-callback')();
}
