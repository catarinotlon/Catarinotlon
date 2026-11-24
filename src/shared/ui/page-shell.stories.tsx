import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { Card, PageIntro, PageShell } from './page-shell';

const meta = {
  title: 'Shared/PageShell',
  component: PageShell,
  tags: ['autodocs'],
  args: { children: <Card>Contenido</Card> },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es' } } },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Frames the content with the header, main landmark, and footer. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeVisible();
    await expect(canvas.getByRole('main')).toHaveTextContent('Contenido');
    await expect(canvas.getByRole('contentinfo')).toBeVisible();
  },
};

/** A narrow column for forms. */
export const Narrow: Story = { args: { width: 'narrow' } };

/** The eyebrow carries the logo's speed lines. */
export const IntroEyebrow: StoryObj<typeof PageIntro> = {
  render: () => <PageIntro eyebrow="Mi cuenta" title="Hola" body="Texto" />,
  play: async ({ canvasElement }) => {
    const eyebrow = within(canvasElement).getByText('Mi cuenta');
    await expect(eyebrow.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};

/** Status cards sit in the middle of the page. */
export const Centered: Story = {
  args: { centered: true, children: 'Contenido' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('main')).toHaveClass('justify-center');
  },
};
