import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { expect, within } from 'storybook/test';

import {
  AccountSkeleton,
  AdminDetailSkeleton,
  AdminListSkeleton,
  FormPageSkeleton,
  KitPickupSkeleton,
  LoadingShell,
  PaymentSkeleton,
  Skeleton,
} from './skeleton';

const meta = { title: 'Shared/Skeleton', tags: ['autodocs'] } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectLoadingRegion(canvasElement: HTMLElement, minBlocks: number) {
  const status = within(canvasElement).getByRole('status');
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(status).toHaveTextContent('Cargando…');
  const blocks = canvasElement.querySelectorAll('[data-slot="skeleton"]');
  await expect(blocks.length).toBeGreaterThanOrEqual(minBlocks);
  for (const block of blocks) await expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
}

const region = (element: ReactElement, minBlocks: number): Story => ({
  render: () => element,
  play: async ({ canvasElement }) => expectLoadingRegion(canvasElement, minBlocks),
});

/** One block: it shimmers, and stays still when the system asks for less motion. */
export const Block: Story = {
  render: () => <Skeleton className="h-6 w-48" />,
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector('[data-slot="skeleton"]');
    await expect(block).toHaveAttribute('aria-hidden', 'true');
    await expect(block).toHaveClass('motion-reduce:animate-none');
  },
};

/** Sign-up, sign-in, registration, and password forms. */
export const FormPage: Story = region(<FormPageSkeleton />, 5);

/** My account: the runner picker and the selected runner's panel. */
export const Account: Story = region(<AccountSkeleton />, 6);

/** Payment: the runners to pay and the transfer details. */
export const Payment: Story = region(<PaymentSkeleton />, 6);

/** Admin list: totals, filters, and table rows. */
export const AdminList: Story = region(<AdminListSkeleton />, 10);

/** Admin detail: a payment review or a registration form. */
export const AdminDetail: Story = region(<AdminDetailSkeleton />, 6);

/** Kit pickup on a phone: search and the runner's kit. */
export const KitPickup: Story = region(<KitPickupSkeleton />, 4);

/** While a page loads, the header never guesses the session: no sign-in links, no avatar. */
export const Shell: Story = {
  render: () => (
    <LoadingShell>
      <FormPageSkeleton />
    </LoadingShell>
  ),
  play: async ({ canvasElement }) => {
    const banner = within(within(canvasElement).getByRole('banner'));
    await expect(banner.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    await expect(banner.queryByRole('link', { name: 'Inscríbete' })).toBeNull();
    await expect(
      within(canvasElement).getByRole('banner').querySelector('[data-slot="skeleton"]'),
    ).not.toBeNull();
  },
};
