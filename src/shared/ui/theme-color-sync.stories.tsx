import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';

import { ThemeColorSync } from './theme-color-sync';

const meta = {
  title: 'Shared/ThemeColorSync',
  component: ThemeColorSync,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeColorSync>;

export default meta;
type Story = StoryObj<typeof meta>;

function themeColor() {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
}

function backgroundToken() {
  return getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
}

/**
 * Renders nothing: it paints the phone's browser bar with the page background of the active
 * theme. Switch the theme toolbar to see the value follow.
 */
export const Default: Story = {
  play: async () => {
    await waitFor(() => expect(themeColor()).toBe(backgroundToken()));
  },
};

/**
 * Navigating to another page makes Next.js write the server's light value back into the meta
 * tag, or swap the tag; the bar returns to the active theme's color.
 */
export const SurvivesNavigation: Story = {
  play: async () => {
    await waitFor(() => expect(themeColor()).toBe(backgroundToken()));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#123456');
    await waitFor(() => expect(themeColor()).toBe(backgroundToken()));

    document.querySelector('meta[name="theme-color"]')?.remove();
    const replacement = document.createElement('meta');
    replacement.name = 'theme-color';
    replacement.content = '#123456';
    document.head.append(replacement);
    await waitFor(() => expect(themeColor()).toBe(backgroundToken()));
  },
};

/** Changing the theme class on `<html>`, which next-themes does, repaints the bar. */
export const FollowsThemeChanges: Story = {
  play: async () => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      root.classList.toggle('dark');
      await waitFor(() => expect(themeColor()).toBe(wasDark ? '#ffffff' : '#0e0e0f'));
    } finally {
      root.classList.toggle('dark', wasDark);
    }
    await waitFor(() => expect(themeColor()).toBe(wasDark ? '#0e0e0f' : '#ffffff'));
  },
};
