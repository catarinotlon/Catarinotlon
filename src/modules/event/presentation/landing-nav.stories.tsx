import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { LandingNav } from './landing-nav';

const meta = {
  title: 'Event/LandingNav',
  component: LandingNav,
  tags: ['autodocs'],
} satisfies Meta<typeof LandingNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Links to each section of the page. */
export const Sections: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const nav = within(
      within(canvasElement).getByRole('navigation', { name: 'Navegación principal', hidden: true }),
    );
    await expect(nav.getByRole('link', { name: 'Distancias', hidden: true })).toHaveAttribute(
      'href',
      '#distancias',
    );
    await expect(nav.getByRole('link', { name: 'Kit del corredor', hidden: true })).toHaveAttribute(
      'href',
      '#kit',
    );
    await expect(
      nav.getByRole('link', { name: 'Día de la carrera', hidden: true }),
    ).toHaveAttribute('href', '#dia-de-carrera');
    await expect(nav.getByRole('link', { name: 'Preguntas', hidden: true })).toHaveAttribute(
      'href',
      '#preguntas',
    );
  },
};

/** On narrow screens the same links open in a drawer, each with its icon, and choosing one closes it. */
export const MobileMenu: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    canvasElement.addEventListener('click', (event) => event.preventDefault());
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    const drawer = within(await canvas.findByRole('dialog', { name: 'Menú' }));
    const faq = drawer.getByRole('link', { name: 'Preguntas' });
    await expect(faq).toHaveAttribute('href', '#preguntas');
    await expect(faq.querySelector('svg')).not.toBeNull();

    await userEvent.click(faq);
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
};

/** On narrow screens, a signed-out visitor registers or signs in from the drawer. */
export const MenuAccountLinks: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    const drawer = within(await canvas.findByRole('dialog', { name: 'Menú' }));
    await expect(drawer.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  },
};

/** A signed-in visitor gets the account card instead of the sign-in links. */
export const MenuSignedIn: Story = {
  args: {
    account: {
      name: 'Sofía Ramírez',
      payableCount: 0,
      runners: [
        {
          id: 'r-1',
          name: 'Sofía Ramírez',
          distance: '5K',
          bibNumber: '48213',
          stage: 'confirmed',
        },
      ],
    },
    signOut: fn<() => Promise<void>>(async () => {}),
  },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    const drawer = within(await canvas.findByRole('dialog', { name: 'Menú' }));
    await expect(drawer.getByRole('button', { name: /Sofía Ramírez.*1 corredor/ })).toBeVisible();
    await expect(drawer.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
  },
};

/** On wide screens an admin reaches the panel from the header's admin chip, not the section links. */
export const AdminLink: Story = {
  globals: { viewport: { value: 'desktop' } },
  args: { isAdmin: true },
  play: async ({ canvasElement }) => {
    const nav = within(
      within(canvasElement).getByRole('navigation', { name: 'Navegación principal', hidden: true }),
    );
    await expect(nav.queryByRole('link', { name: 'Admin', hidden: true })).toBeNull();
  },
};

/** A runner who is not an admin sees no admin link. */
export const NoAdminLink: Story = {
  globals: { viewport: { value: 'desktop' } },
  args: { isAdmin: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('link', { name: 'Admin', hidden: true }),
    ).toBeNull();
  },
};

/** On narrow screens the admin link is in the drawer. */
export const MenuAdminLink: Story = {
  args: { isAdmin: true },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    const drawer = within(await canvas.findByRole('dialog', { name: 'Menú' }));
    await expect(drawer.getByRole('link', { name: 'Admin' })).toBeVisible();
  },
};

/** On every other page, the same sections link back to the landing page. */
export const SectionsFromOtherPages: Story = {
  globals: { viewport: { value: 'desktop' } },
  args: { onLanding: false },
  play: async ({ canvasElement }) => {
    const nav = within(
      within(canvasElement).getByRole('navigation', { name: 'Navegación principal', hidden: true }),
    );
    await expect(nav.getByRole('link', { name: 'Distancias', hidden: true })).toHaveAttribute(
      'href',
      '/es#distancias',
    );
    await expect(nav.getByRole('link', { name: 'Preguntas', hidden: true })).toHaveAttribute(
      'href',
      '/es#preguntas',
    );
  },
};
