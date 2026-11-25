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
        'Las dos distancias incluyen lo mismo: playera personalizada y número de corredor en tu kit, y medalla al cruzar la meta.',
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

/** The kit section says what the kit holds and that it is collected on race day. */
export const KitOnRaceDay: Story = {
  ...(FactsConfigured.args ? { args: FactsConfigured.args } : {}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const kitSection = canvasElement.querySelector<HTMLElement>('#kit');
    await expect(kitSection).not.toBeNull();
    const kit = within(kitSection as HTMLElement);
    await expect(kit.getByRole('heading', { name: 'Tu número de corredor' })).toBeVisible();
    await expect(
      kit.getByText('Lo llevas al frente de la playera. Es el mismo número de tu boleto.'),
    ).toBeVisible();
    await expect(kit.getByText('Entrega del kit: el día de la carrera')).toBeVisible();
    await expect(kit.getByText('Sample pickup details')).toBeVisible();
    await expect(kit.getByText('Muestra tu boleto para recogerlo.')).toBeVisible();
    await expect(kit.getAllByText(/con tu nombre/)).toHaveLength(1);
    const bib = kit.getByRole('img', { name: 'Ejemplo de número de corredor: 48213, 3K/5K' });
    await expect(within(bib).getByText('3K/5K')).toBeVisible();
    await expect(canvas.getByText('Número de corredor en tu kit')).toBeVisible();

    const timeline = within(canvas.getByRole('list', { name: 'De la salida a la meta' }));
    await expect(
      timeline.getByText(
        'El mismo día de la carrera. Ahí recibes tu playera y tu número de corredor.',
      ),
    ).toBeVisible();
  },
};

/** The facts band gives each start its own column, with the half of the day spelled out. */
export const StartTimes: Story = {
  ...(FactsConfigured.args ? { args: FactsConfigured.args } : {}),
  play: async ({ canvasElement }) => {
    const band = within(within(canvasElement).getByTestId('facts-band'));
    await expect(band.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Fecha',
      'Salida 3K',
      'Salida 5K',
      'Sede',
    ]);
    const three = band.getByText('Salida 3K').nextElementSibling as HTMLElement;
    await expect(three.textContent?.replace(/\s+/g, ' ')).toBe('7:00 a. m.');
    await expect(within(three).getByText('a. m.')).toHaveClass('text-muted-foreground');
    const five = band.getByText('Salida 5K').nextElementSibling as HTMLElement;
    await expect(five.textContent?.replace(/\s+/g, ' ')).toBe('7:30 a. m.');
  },
};
