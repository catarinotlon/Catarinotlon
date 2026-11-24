import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { expect, within } from 'storybook/test';

import { ShareCard, ShareCardAccent, SHARE_CARD_SIZE } from './share-card';

/** Builds the card from the real messages, the way the share image route does. */
function TranslatedShareCard() {
  const t = useTranslations('share');
  const shirt = useTranslations('shirt');
  return (
    <ShareCard
      eyebrow={t.rich('eyebrow', { year: (chunks) => <ShareCardAccent>{chunks}</ShareCardAccent> })}
      headline={t.rich('headline', {
        highlight: (chunks) => <ShareCardAccent>{chunks}</ShareCardAccent>,
      })}
      perks={t('perks')}
      distances={['3K', '5K']}
      shirtName={shirt('placeholderName')}
      shirtSrc="/images/shirt/shirt-back-blank.jpg"
      medalSrc="/images/medals/finisher-5k.webp"
    />
  );
}

const meta = {
  title: 'Shared/ShareCard',
  component: TranslatedShareCard,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TranslatedShareCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The image social networks show when someone shares a link to the site. It is rendered to a
 * PNG on the server, so it is light only and looks the same in both themes.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('share-card');
    await expect(card).toHaveTextContent(
      /Nos vemos en el Catarinotlón|See you at the Catarinotlón/,
    );
    await expect(card).toHaveTextContent(/2026/);
    await expect(card).toHaveTextContent(/Playera personalizada|Custom shirt/);
    await expect(canvas.getByText('3K')).toBeVisible();
    await expect(canvas.getByText('5K')).toBeVisible();
    await expect(canvas.getByTestId('share-card-shirt-name')).toHaveTextContent(/NOMBRE|NAME/);
  },
};

/** The card is exactly the size social networks expect, 1200 × 630. */
export const Size: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('share-card').getBoundingClientRect();
    await expect({ width: box.width, height: box.height }).toEqual(SHARE_CARD_SIZE);
  },
};
