import path from 'node:path';

import {
  Document,
  Font,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { createTranslator } from 'next-intl';
import QRCode from 'qrcode';

import { shirtNameWidthRatio } from '@/shared/domain/shirt-print';

import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';
import type { TicketDocument, TicketPdfRenderer } from '../application/ports/ticket-pdf-renderer';

const ASSETS = path.join(process.cwd(), 'src/modules/ticketing/infrastructure/pdf-assets');
const asset = (...parts: string[]) => path.join(ASSETS, ...parts);

Font.register({
  family: 'Barlow Condensed',
  fonts: [
    {
      src: asset('fonts', 'BarlowCondensed-BlackItalic.ttf'),
      fontWeight: 900,
      fontStyle: 'italic',
    },
    { src: asset('fonts', 'BarlowCondensed-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({
  family: 'Barlow',
  fonts: [
    { src: asset('fonts', 'Barlow-Regular.ttf'), fontWeight: 400 },
    { src: asset('fonts', 'Barlow-Bold.ttf'), fontWeight: 700 },
  ],
});

/**
 * The finisher medal image for a distance.
 *
 * @param distance - `3K` or `5K`.
 * @returns The absolute path of the medal image.
 */
export function medalImagePath(distance: string): string {
  return asset(distance === '3K' ? 'medal-finisher-3k.png' : 'medal-finisher-5k.png');
}

const INK = '#121212';
const RED = '#D42016';
const MUTED = '#4A4A4E';
const PAGE = { width: 720, height: 450, padding: 18 };
const STUB_WIDTH = 180;
const SHIRT_WIDTH = 140;
const MAIN_PADDING = 22;
const GAP = 16;
// react-pdf measures text in flexible columns as if they had no width, so the
// ticket, whose page size is fixed, lays out with fixed widths.
const DETAILS_WIDTH =
  PAGE.width - PAGE.padding * 2 - 2 - STUB_WIDTH - MAIN_PADDING * 2 - SHIRT_WIDTH - GAP;

const styles = StyleSheet.create({
  page: {
    padding: PAGE.padding,
    fontFamily: 'Barlow',
    fontSize: 10,
    color: INK,
    backgroundColor: '#FFFFFF',
  },
  ticket: {
    height: PAGE.height - PAGE.padding * 2,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#C4C4C9',
    borderRadius: 16,
  },
  main: { flexDirection: 'row', padding: MAIN_PADDING },
  details: { width: DETAILS_WIDTH, height: '100%', marginRight: GAP },
  brand: { fontFamily: 'Barlow Condensed', fontWeight: 900, fontStyle: 'italic', fontSize: 20 },
  label: { fontSize: 8, color: MUTED },
  name: {
    fontFamily: 'Barlow Condensed',
    fontWeight: 900,
    fontStyle: 'italic',
    fontSize: 28,
    lineHeight: 1,
    textTransform: 'uppercase',
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  fact: { width: '50%', marginBottom: 8, paddingRight: 8 },
  factWide: { width: '100%', marginBottom: 8 },
  value: { fontWeight: 700, fontSize: 11 },
  medal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F3',
  },
  medalImage: { height: 52, width: (52 * 222) / 560, marginRight: 10 },
  help: { fontSize: 7.5, color: MUTED, marginTop: 6 },
  shirt: { width: SHIRT_WIDTH, alignSelf: 'center', transform: 'rotate(3deg)' },
  shirtImage: { width: SHIRT_WIDTH, height: (SHIRT_WIDTH * 879) / 600, borderRadius: 10 },
  shirtName: {
    position: 'absolute',
    left: 0,
    right: 0,
    // The print band sits at 17.2–25% of the shirt's height; the box is a
    // little taller so the largest name is never clipped.
    top: ((SHIRT_WIDTH * 879) / 600) * 0.172 - 6,
    height: ((SHIRT_WIDTH * 879) / 600) * 0.078 + 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shirtNameText: {
    lineHeight: 1,
    fontFamily: 'Barlow Condensed',
    fontWeight: 900,
    fontStyle: 'italic',
    color: '#1A1A1A',
  },
  stub: {
    width: STUB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: RED,
    color: '#FFFFFF',
    borderLeftWidth: 2,
    borderLeftColor: '#FFFFFF',
    borderLeftStyle: 'dashed',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
  notch: {
    position: 'absolute',
    left: -11,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C4C4C9',
  },
  distance: { fontFamily: 'Barlow Condensed', fontWeight: 900, fontStyle: 'italic', fontSize: 30 },
  qrBox: { marginTop: 8, padding: 6, borderRadius: 10, backgroundColor: '#FFFFFF' },
  qr: { width: 120, height: 120 },
  stubLabel: { marginTop: 8, fontSize: 8 },
  bib: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 26, letterSpacing: 1 },
  stubHelp: { marginTop: 4, fontSize: 8, textAlign: 'center' },
});

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={wide ? styles.factWide : styles.fact}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/**
 * {@link TicketPdfRenderer} adapter backed by `@react-pdf/renderer`.
 *
 * @remarks
 * Draws the ticket with a tear-off stub: the runner's details, their shirt
 * with the printed name, and the medal of their distance on the main part;
 * the distance, the QR, and the bib number on the red stub.
 */
export class ReactPdfTicketRenderer implements TicketPdfRenderer {
  async render(document: TicketDocument): Promise<Uint8Array> {
    const locale = document.locale === 'en' ? 'en' : 'es';
    const t = createTranslator({
      locale,
      messages: locale === 'en' ? en : es,
      namespace: 'ticket',
    });
    const qr = await QRCode.toDataURL(document.qrPayload, { margin: 1, width: 360 });
    const pending = t('pending');
    const printed = document.shirtName.trim().toLocaleUpperCase(locale);
    const nameSize = SHIRT_WIDTH * shirtNameWidthRatio(printed);

    const buffer = await renderToBuffer(
      <Document title={t('title')} language={locale}>
        <Page size={[PAGE.width, PAGE.height]} style={styles.page}>
          <View style={styles.ticket}>
            <View style={styles.main}>
              <View style={styles.details}>
                <Text style={styles.brand}>
                  CATARINOTLÓN <Text style={{ color: RED }}>2026</Text>
                </Text>
                <Text style={[styles.label, { marginTop: 12 }]}>{t('runner')}</Text>
                <Text style={styles.name}>{document.runnerName}</Text>
                <View style={styles.facts}>
                  <Fact label={t('date')} value={document.eventDate ?? pending} />
                  <Fact label={t('start')} value={document.startTime ?? pending} />
                  <Fact label={t('venue')} value={document.venue ?? pending} wide />
                  <Fact
                    label={t('shirt')}
                    value={t('shirtLine', { name: document.shirtName, size: document.shirtSize })}
                    wide
                  />
                </View>
                <View style={styles.medal}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop. */}
                  <Image style={styles.medalImage} src={medalImagePath(document.distance)} />
                  <Text style={{ width: DETAILS_WIDTH - 70 }}>
                    {t('medalLine', { distance: document.distance })}
                  </Text>
                </View>
                <Text style={styles.help}>{t('help')}</Text>
              </View>
              <View style={styles.shirt}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop. */}
                <Image style={styles.shirtImage} src={asset('shirt-back-blank.jpg')} />
                <View style={styles.shirtName}>
                  <Text style={[styles.shirtNameText, { fontSize: nameSize }]}>{printed}</Text>
                </View>
              </View>
            </View>
            <View style={styles.stub}>
              <View style={[styles.notch, { top: -11 }]} />
              <View style={[styles.notch, { bottom: -11 }]} />
              <Text style={styles.distance}>{document.distance}</Text>
              <View style={styles.qrBox}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop. */}
                <Image style={styles.qr} src={qr} />
              </View>
              <Text style={styles.stubLabel}>{t('bibLabel')}</Text>
              <Text style={styles.bib}>{document.bibNumber}</Text>
              <Text style={styles.stubHelp}>{t('showAtPickup')}</Text>
            </View>
          </View>
        </Page>
      </Document>,
    );
    return new Uint8Array(buffer);
  }
}
