import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { fakeTurnstile, installFakeTurnstile } from '@/test/fake-turnstile';

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
