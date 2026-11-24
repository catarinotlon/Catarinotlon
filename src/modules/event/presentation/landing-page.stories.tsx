import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { LandingFacts } from './landing-facts';
import { LandingPage } from './landing-page';

const missing: LandingFacts = {
  eventDate: null,
  startThree: null,
  startFive: null,
  venue: null,
  kitPickup: null,
  routeMapUrl: null,
  feeAmount: null,
  shirtSizes: [],
  paymentOpen: false,
};

const meta = {
  title: 'Event/LandingPage',
  component: LandingPage,
  tags: ['autodocs'],
  args: { facts: missing },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the organizer enters the event facts. */
export const FactsPending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('Por confirmar').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('Inscripciones próximamente').length).toBeGreaterThan(0);
    await expect(canvas.getByRole('main').textContent).not.toContain('[');
  },
};

/** With the facts configured. These sample values are placeholders for the story. */
export const FactsConfigured: Story = {
  args: {
    facts: {
      eventDate: '2026-01-15',
      startThree: '07:00',
      startFive: '07:30',
      venue: 'Sample venue',
      kitPickup: 'Sample pickup details',
      routeMapUrl: 'https://example.test/route',
      feeAmount: 100,
      shirtSizes: ['Size A', 'Size B'],
      paymentOpen: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('Sample venue').length).toBeGreaterThan(0);
    await expect(canvas.queryByText('Inscripciones próximamente')).toBeNull();
    await expect(canvas.getByRole('link', { name: 'Ver el mapa de la ruta' })).toBeVisible();
  },
};

/** The sections follow the approved layout. */
export const Layout: Story = {
  ...(FactsConfigured.args ? { args: FactsConfigured.args } : {}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('facts-band')).toHaveClass('bg-ink');
    await expect(canvasElement.querySelector('#medallas')).toHaveClass('dark');
    await expect(
      canvas.getByText('¿Qué incluye mi inscripción?').closest('details'),
    ).toHaveAttribute('open');
    const timeline = within(canvas.getByRole('list', { name: 'De la salida a la meta' }));
    await expect(timeline.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getByTestId('distance-5K')).toHaveClass('bg-primary');
    await expect(canvas.getByText('Frente')).toHaveClass('rounded-full');
    await expect(canvas.getByText('Espalda')).toHaveClass('rounded-full');
    await expect(
      canvas.getByText(
        'Las dos distancias incluyen el kit completo: playera personalizada y medalla.',
      ),
    ).toHaveClass('font-bold');
    await expect(
      canvas.getByRole('link', { name: 'Ya tengo cuenta · Iniciar sesión' }),
    ).toHaveClass('uppercase');
    await expect(canvas.getByText('¿Qué incluye mi inscripción?').closest('summary')).toHaveClass(
      'font-display',
    );
    await expect(timeline.getAllByRole('listitem')[2]?.querySelector('svg')).not.toBeNull();
  },
};
