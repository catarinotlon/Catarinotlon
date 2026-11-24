import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

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

/** On narrow screens the same links open from a menu button and close on choosing one. */
export const MobileMenu: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    canvasElement.addEventListener('click', (event) => event.preventDefault());
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Abrir menú' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    const close = canvas.getByRole('button', { name: 'Cerrar menú' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    const menu = within(canvas.getByRole('navigation', { name: 'Menú' }));

    await userEvent.click(menu.getByRole('link', { name: 'Preguntas' }));
    await expect(canvas.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};

/** On narrow screens, a signed-out visitor registers or signs in from the menu. */
export const MenuAccountLinks: Story = {
  args: { signedIn: false },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    await expect(canvas.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  },
};

/** A signed-in visitor is not offered to sign in again. */
export const MenuSignedIn: Story = {
  args: { signedIn: true },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    await expect(canvas.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
  },
};

/** An admin reaches the panel from the main navigation. */
export const AdminLink: Story = {
  args: { signedIn: true, isAdmin: true },
  play: async ({ canvasElement }) => {
    const nav = within(
      within(canvasElement).getByRole('navigation', { name: 'Navegación principal', hidden: true }),
    );
    await expect(nav.getByRole('link', { name: 'Admin', hidden: true })).toHaveAttribute(
      'href',
      '/es/admin',
    );
  },
};

/** A runner who is not an admin sees no admin link. */
export const NoAdminLink: Story = {
  args: { signedIn: true, isAdmin: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('link', { name: 'Admin', hidden: true }),
    ).toBeNull();
  },
};

/** On narrow screens the admin link is in the menu. */
export const MenuAdminLink: Story = {
  args: { signedIn: true, isAdmin: true },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menú' }));
    await expect(
      within(canvas.getByRole('navigation', { name: 'Menú' })).getByRole('link', { name: 'Admin' }),
    ).toBeVisible();
  },
};
