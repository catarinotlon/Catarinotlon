import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

const meta = {
  title: 'Shared/SiteChrome',
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es' } } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The header offers the theme switch, sign-in, and registration. */
export const Header: Story = {
  render: () => <SiteHeader />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /Catarinotlón 2026/ })).toBeVisible();
  },
};

/** On a phone, a header with the site navigation leaves the theme and the account to its menu. */
export const PhoneHeaderWithMenu: Story = {
  globals: { viewport: { value: 'mobile1' } },
  render: () => <SiteHeader navigation={<button type="button">Abrir menú</button>} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Cambiar a tema/ })).toBeNull();
    await expect(canvas.queryByRole('link', { name: 'Inscríbete' })).toBeNull();
  },
};

/** On a phone, a header without a menu, such as the admin one, keeps the theme switch. */
export const PhoneHeaderWithoutMenu: Story = {
  globals: { viewport: { value: 'mobile1' } },
  render: () => <SiteHeader badge="Admin" actions={<></>} />,
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('button', { name: /Cambiar a tema/ }),
    ).toBeVisible();
  },
};

/** The footer carries the legal links and the language switch. */
export const Footer: Story = {
  render: () => <SiteFooter />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Términos y condiciones' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Aviso de privacidad' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'English' })).toBeVisible();
  },
};

/** The landing footer also links to each section and names the race. */
export const LandingFooter: Story = {
  render: () => (
    <SiteFooter
      tagline="Carrera 3K y 5K"
      sections={[
        { href: '#distancias', label: 'Distancias' },
        { href: '#preguntas', label: 'Preguntas' },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Carrera 3K y 5K')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Preguntas' })).toHaveAttribute(
      'href',
      '#preguntas',
    );
    await expect(canvas.getByRole('contentinfo')).toHaveClass('dark');
    await expect(canvas.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
  },
};

/** The admin footer names the panel. */
export const AdminFooter: Story = {
  render: () => <SiteFooter admin />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('© 2026 Catarinotlón · Panel de administración')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Términos y condiciones' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'English' })).toBeVisible();
  },
};

/** Admin pages mark the header with a badge. */
export const HeaderBadge: Story = {
  render: () => <SiteHeader badge="ADMIN" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('ADMIN')).toBeVisible();
  },
};

/** Signed out, the header offers a plain sign-in link and the red registration pill. */
export const HeaderSignedOutLinks: Story = {
  render: () => <SiteHeader />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const signIn = canvas.getByRole('link', { name: 'Iniciar sesión' });
    await expect(getComputedStyle(signIn).borderTopWidth).toBe('0px');
    await expect(canvas.getByRole('link', { name: 'Inscríbete' })).toHaveClass('rounded-full');
  },
};
