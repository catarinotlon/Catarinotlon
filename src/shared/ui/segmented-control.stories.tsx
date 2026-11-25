import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { SegmentedControl, type SegmentedControlProps } from './segmented-control';

const OPTIONS = [
  { value: '3K', label: '3K' },
  { value: '5K', label: '5K' },
] as const;

function Stateful(props: Omit<SegmentedControlProps, 'value'> & { initial: string }) {
  const { initial, onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const meta = {
  title: 'Shared/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  args: { options: OPTIONS, value: '5K', name: 'distance', legend: 'Distancia' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const thumbLeft = (canvasElement: HTMLElement) =>
  within(canvasElement).getByTestId('segmented-thumb').getBoundingClientRect().left;

/** A pill-shaped pair of choices whose highlight slides to the chosen one. */
export const Pill: Story = {
  render: (args) => <Stateful {...args} initial="5K" />,
  args: { variant: 'pill', onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByTestId('segmented-thumb');
    await expect(thumb).toHaveClass('transition-transform', 'motion-reduce:transition-none');
    await expect(canvas.getByRole('radio', { name: '5K' })).toBeChecked();
    const before = thumbLeft(canvasElement);

    await userEvent.click(canvas.getByRole('radio', { name: '3K' }));
    await expect(args.onChange).toHaveBeenCalledWith('3K');
    await expect(canvas.getByRole('radio', { name: '3K' })).toBeChecked();
    await waitFor(() => expect(thumbLeft(canvasElement)).toBeLessThan(before));
    await expect(canvas.getByText('3K')).toHaveClass('text-inverse-foreground');
  },
};

/** The large form version, with a gap between the choices, slides the same way. */
export const Block: Story = {
  render: (args) => (
    <div className="max-w-md">
      <Stateful {...args} initial="3K" />
    </div>
  ),
  args: { variant: 'block' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByTestId('segmented-thumb');
    const five = canvas.getByText('5K');
    await userEvent.click(canvas.getByRole('radio', { name: '5K' }));
    await waitFor(() =>
      expect(Math.round(thumb.getBoundingClientRect().left)).toBe(
        Math.round(five.getBoundingClientRect().left),
      ),
    );
    await expect(Math.round(thumb.getBoundingClientRect().width)).toBe(
      Math.round(five.getBoundingClientRect().width),
    );
  },
};

/** Choices that navigate render as links; the current one is marked and not a link. */
export const Links: Story = {
  args: {
    variant: 'pill',
    value: 'es',
    label: 'Idioma',
    options: [
      { value: 'es', label: 'ES' },
      { value: 'en', label: 'EN' },
    ],
    renderOption: (option, { selected, className }) =>
      selected ? (
        <span aria-current="true" className={className}>
          {option.label}
        </span>
      ) : (
        <a href={`/${option.value}`} className={className}>
          {option.label}
        </a>
      ),
  },
  play: async ({ canvasElement }) => {
    const group = within(within(canvasElement).getByRole('group', { name: 'Idioma' }));
    await expect(group.getByText('ES')).toHaveAttribute('aria-current', 'true');
    await expect(group.getByRole('link', { name: 'EN' })).toHaveAttribute('href', '/en');
    await expect(group.queryByRole('radio')).toBeNull();
  },
};

/** The quiet header version: no outline, and a soft highlight that sits exactly on the chosen choice. */
export const Subtle: Story = {
  args: {
    variant: 'subtle',
    value: 'en',
    label: 'Idioma',
    options: [
      { value: 'es', label: 'ES' },
      { value: 'en', label: 'EN' },
    ],
    renderOption: (option, { selected, className }) =>
      selected ? (
        <span aria-current="true" className={className}>
          {option.label}
        </span>
      ) : (
        <a href={`/${option.value}`} className={className}>
          {option.label}
        </a>
      ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      const chosen = canvas.getByText('EN').getBoundingClientRect();
      const thumb = canvas.getByTestId('segmented-thumb').getBoundingClientRect();
      expect(Math.abs(thumb.left - chosen.left)).toBeLessThan(1);
      expect(Math.abs(thumb.width - chosen.width)).toBeLessThan(1);
    });
    const track = canvas.getByRole('group', { name: 'Idioma' });
    await expect(getComputedStyle(track).borderTopWidth).toBe('0px');
  },
};
