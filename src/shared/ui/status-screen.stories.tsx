import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ErrorScreen, NotFoundScreen } from './status-screen';

const meta = {
  title: 'Shared/StatusScreens',
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es' } } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const retry = fn();

/** A friendly error, with a retry that re-renders the page. */
export const Error: Story = {
  render: () => <ErrorScreen onRetry={retry} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Algo salió mal' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(retry).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('link', { name: 'Ir al inicio' })).toBeVisible();
  },
};

/** The 404 page. */
export const NotFound: Story = {
  render: () => <NotFoundScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Te saliste de la ruta' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Ir a mi cuenta' })).toBeVisible();
  },
};
