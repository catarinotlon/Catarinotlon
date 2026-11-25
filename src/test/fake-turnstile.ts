import { expect, fn, waitFor } from 'storybook/test';

/** A stand-in for Cloudflare's `window.turnstile`, so stories never load the real script. */
export interface FakeTurnstile {
  /** Renders a widget and returns its ID, `widget-1`. */
  readonly render: ReturnType<
    typeof fn<(container: HTMLElement, options: Record<string, unknown>) => string>
  >;
  /** Starts a fresh challenge. */
  readonly reset: ReturnType<typeof fn<(widgetId: string) => void>>;
  /** Removes a widget. */
  readonly remove: ReturnType<typeof fn<(widgetId: string) => void>>;
}

/** The fake the current story installed. */
export let fakeTurnstile: FakeTurnstile = createFake();

function createFake(): FakeTurnstile {
  return {
    render: fn((_container: HTMLElement, _options: Record<string, unknown>) => 'widget-1'),
    reset: fn((_widgetId: string) => undefined),
    remove: fn((_widgetId: string) => undefined),
  };
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
  await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
  return fakeTurnstile.render.mock.calls[0]![0];
}
