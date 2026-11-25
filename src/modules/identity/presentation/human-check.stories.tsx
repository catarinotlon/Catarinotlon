import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type FormEvent } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  expireHumanCheck,
  failHumanCheck,
  fakeTurnstile,
  installFakeTurnstile,
  rejectBrowser,
  solveHumanCheck,
} from '@/test/fake-turnstile';

import { HumanCheck } from './human-check';

const meta = {
  title: 'Identity/HumanCheck',
  component: HumanCheck,
  tags: ['autodocs'],
  beforeEach: installFakeTurnstile,
} satisfies Meta<typeof HumanCheck>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Turnstile in its "interaction-only" appearance: invisible for most people, it shows
 * a checkbox only when Cloudflare is unsure. It follows the page's language and theme.
 */
export const Ready: Story = {
  args: { siteKey: 'story-site-key' },
  play: async ({ canvasElement, globals }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    const [container, options] = fakeTurnstile.render.mock.calls[0]!;
    await expect(canvasElement.contains(container)).toBe(true);
    await expect(options).toMatchObject({
      sitekey: 'story-site-key',
      appearance: 'interaction-only',
      size: 'flexible',
      language: globals.locale === 'en' ? 'en' : 'es',
      theme: globals.theme === 'dark' ? 'dark' : 'light',
    });
  },
};

/** When Cloudflare needs the visitor to tick the box, the widget gets room above the button. */
export const AsksThePersonToInteract: Story = {
  args: { siteKey: 'story-site-key' },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    const container = canvasElement.querySelector<HTMLElement>('[data-human-check]')!;
    await expect(getComputedStyle(container).marginBottom).toBe('0px');

    const options = fakeTurnstile.render.mock.calls[0]![1] as {
      'before-interactive-callback': () => void;
    };
    options['before-interactive-callback']();

    await waitFor(() => expect(getComputedStyle(container).marginBottom).not.toBe('0px'));
  },
};

/** Without a site key (local development, E2E) there is no challenge at all. */
export const Off: Story = {
  args: { siteKey: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-human-check]')).toBeNull();
    await expect(fakeTurnstile.render).not.toHaveBeenCalled();
  },
};

function ResetDemo() {
  const [failure, setFailure] = useState<object | undefined>(undefined);
  return (
    <>
      <HumanCheck siteKey="story-site-key" resetSignal={failure} />
      <button type="button" onClick={() => setFailure({})}>
        Fail the check
      </button>
    </>
  );
}

/** After the server refuses a token, the widget starts a fresh challenge. */
export const ResetsAfterAFailedCheck: Story = {
  args: { siteKey: 'story-site-key' },
  render: () => <ResetDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    await expect(fakeTurnstile.reset).not.toHaveBeenCalled();

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Fail the check' }));

    await waitFor(() => expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1'));
  },
};

/** What the demo form sent to the server: the token field of each submission. */
const sent = fn<(token: FormDataEntryValue | null) => void>();

function FormDemo() {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sent(new FormData(event.currentTarget).get('cf-turnstile-response'));
  }
  return (
    <form onSubmit={onSubmit}>
      <HumanCheck siteKey="story-site-key" />
      <button type="submit">Send</button>
    </form>
  );
}

const formStory = {
  args: { siteKey: 'story-site-key' },
  render: () => <FormDemo />,
  beforeEach: () => {
    sent.mockClear();
    return installFakeTurnstile();
  },
} satisfies Story;

/** With a valid token, the form is sent at once, carrying it. */
export const SendsWithAToken: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    solveHumanCheck('token-1');

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Send' }));

    await expect(sent.mock.calls).toEqual([['token-1']]);
  },
};

/**
 * Sent before Cloudflare answers, the form waits instead of reaching the server
 * without a token, says it is checking, and goes out by itself once the token arrives.
 */
export const WaitsForTheToken: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));

    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));

    await expect(sent).not.toHaveBeenCalled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Comprobando que eres una persona…');

    solveHumanCheck('token-1');

    await waitFor(() => expect(sent.mock.calls).toEqual([['token-1']]));
    await expect(canvas.queryByText('Comprobando que eres una persona…')).toBeNull();
  },
};

/** A token that expired while the tab was paused is refreshed before the form goes out. */
export const RefreshesAnExpiredToken: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    solveHumanCheck('old-token');
    expireHumanCheck();

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Send' }));

    await expect(sent).not.toHaveBeenCalled();
    await expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1');

    solveHumanCheck('new-token');

    await waitFor(() => expect(sent.mock.calls).toEqual([['new-token']]));
  },
};

/**
 * When Cloudflare cannot finish the challenge there is no box to tick, so the form
 * says so next to the button and offers to try again.
 */
export const ExplainsAFailedCheck: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));

    failHumanCheck('600010');

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      /La verificación de seguridad no pudo completarse/,
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));

    await expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1');
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

/** A browser Cloudflare does not support gets the same explanation. */
export const ExplainsAnUnsupportedBrowser: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));

    rejectBrowser();

    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      /La verificación de seguridad no pudo completarse/,
    );
  },
};

/** Sending after a failure starts a new challenge and waits for it instead of sending nothing. */
export const RetriesWhenSentAfterAFailure: Story = {
  ...formStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(1));
    failHumanCheck();
    await canvas.findByRole('alert');

    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));

    await expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1');
    await expect(sent).not.toHaveBeenCalled();
    solveHumanCheck('token-2');

    await waitFor(() => expect(sent.mock.calls).toEqual([['token-2']]));
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
