import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import { createTranslator } from 'next-intl';
import QRCode from 'qrcode';

import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';
import type { TicketDocument, TicketPdfRenderer } from '../application/ports/ticket-pdf-renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 12, color: '#121212' },
  ticket: { borderWidth: 2, borderColor: '#121212', borderRadius: 12 },
  header: {
    backgroundColor: '#D42016',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  brand: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Helvetica-BoldOblique' },
  body: { flexDirection: 'row', padding: 18, gap: 18 },
  details: { flex: 1, gap: 8 },
  label: { fontSize: 9, color: '#4A4A4E' },
  value: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  qr: { width: 170, height: 170 },
  help: { paddingHorizontal: 18, paddingBottom: 18, fontSize: 10, color: '#4A4A4E' },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** {@link TicketPdfRenderer} adapter backed by `@react-pdf/renderer`. */
export class ReactPdfTicketRenderer implements TicketPdfRenderer {
  async render(document: TicketDocument): Promise<Uint8Array> {
    const locale = document.locale === 'en' ? 'en' : 'es';
    const t = createTranslator({
      locale,
      messages: locale === 'en' ? en : es,
      namespace: 'ticket',
    });
    const qr = await QRCode.toDataURL(document.qrPayload, { margin: 1, width: 340 });
    const pending = t('pending');

    const buffer = await renderToBuffer(
      <Document title={t('title')} language={locale}>
        <Page size="A5" orientation="landscape" style={styles.page}>
          <View style={styles.ticket}>
            <View style={styles.header}>
              <Text style={styles.brand}>CATARINOTLÓN 2026</Text>
              <Text style={styles.brand}>{document.distance}</Text>
            </View>
            <View style={styles.body}>
              <View style={styles.details}>
                <Row label={t('runner')} value={document.runnerName} />
                <Row label={t('bib')} value={document.bibNumber} />
                <Row label={t('shirt')} value={`${document.shirtName} · ${document.shirtSize}`} />
                <Row label={t('date')} value={document.eventDate ?? pending} />
                <Row label={t('start')} value={document.startTime ?? pending} />
                <Row label={t('venue')} value={document.venue ?? pending} />
              </View>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop. */}
              <Image style={styles.qr} src={qr} />
            </View>
            <Text style={styles.help}>{t('help')}</Text>
          </View>
        </Page>
      </Document>,
    );
    return new Uint8Array(buffer);
  }
}
