import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Row,
  Section,
  Text,
} from 'react-email';

import type { EmailContent, EmailTicket } from './email-content';

/** Content ID of the ticket QR image. */
export const QR_CONTENT_ID = 'ticket-qr';

const COLORS = {
  red: '#D42016',
  redOnInk: '#FF5A4D',
  ink: '#121212',
  gold: '#D8B25A',
  muted: '#4A4A4E',
  soft: '#F2F2F3',
  page: '#E8E8EA',
  line: '#D5D5D8',
  white: '#FFFFFF',
};

const BODY_FONT = 'Barlow, Arial, Helvetica, sans-serif';
const DISPLAY_FONT = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
const RIBBON_DOTS = '●  ●●   ●●   ●  ●  ●   ●   ●  ●  ●   ●●   ●●   ●  ●  ●';

const display = {
  fontFamily: DISPLAY_FONT,
  fontStyle: 'italic',
  fontWeight: 900,
  textTransform: 'uppercase',
} as const;

const panel = {
  background: COLORS.soft,
  borderRadius: 12,
  margin: '16px 0',
  padding: '16px 20px',
} as const;

const ctaBase = {
  borderRadius: 999,
  boxSizing: 'border-box',
  color: COLORS.white,
  display: 'block',
  padding: '16px 24px',
  textAlign: 'center',
  textDecoration: 'none',
} as const;

const ticketLabel = {
  color: COLORS.gold,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1.5,
  margin: 0,
  textTransform: 'uppercase',
} as const;

const ticketValue = {
  color: COLORS.white,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: '22px',
  margin: '2px 0 0',
} as const;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function DetailRows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return rows.map(([label, value], index) => (
    <Row key={label} style={index === 0 ? {} : { borderTop: `1px solid ${COLORS.line}` }}>
      <Column style={{ color: COLORS.muted, fontSize: 15, padding: '9px 8px 9px 0' }}>
        {label}
      </Column>
      <Column
        align="right"
        style={{ color: COLORS.ink, fontSize: 15, fontWeight: 700, padding: '9px 0' }}
      >
        {value}
      </Column>
    </Row>
  ));
}

/**
 * The ticket as a card with a tear-off stub, like the PDF.
 *
 * @remarks
 * The data goes in two columns and the QR on the stub below it, so the values
 * keep a readable width on a phone instead of sharing one row with the QR.
 */
function TicketCard({
  ticket,
  qrAlt,
  qrSrc,
}: {
  ticket: EmailTicket;
  qrAlt: string | undefined;
  qrSrc: string;
}) {
  return (
    <Section style={{ background: COLORS.ink, borderRadius: 16, margin: '20px 0' }}>
      <Row>
        <Column style={{ padding: '20px 0 12px 20px' }}>
          <Text
            style={{
              ...display,
              color: COLORS.white,
              fontSize: 19,
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            CATARINOTLÓN <span style={{ color: COLORS.redOnInk }}>2026</span>
          </Text>
        </Column>
        <Column align="right" style={{ padding: '20px 20px 12px 8px', width: 64 }}>
          <span
            style={{
              ...display,
              background: COLORS.red,
              borderRadius: 999,
              color: COLORS.white,
              fontSize: 18,
              padding: '4px 14px',
              whiteSpace: 'nowrap',
            }}
          >
            {ticket.distance}
          </span>
        </Column>
      </Row>
      <Section style={{ padding: '4px 20px 6px' }}>
        <Text style={ticketLabel}>{ticket.label}</Text>
        <Text
          style={{
            color: COLORS.white,
            fontFamily: DISPLAY_FONT,
            fontSize: 24,
            fontWeight: 800,
            lineHeight: '28px',
            margin: '2px 0 14px',
          }}
        >
          {ticket.runnerName}
        </Text>
        {chunk(ticket.rows, 2).map((cells) => (
          <Row key={cells[0]?.[0]}>
            {cells.map(([label, value], index) => (
              <Column
                key={label}
                style={{
                  padding: index === 0 ? '0 12px 14px 0' : '0 0 14px',
                  verticalAlign: 'top',
                  width: '50%',
                }}
              >
                <Text style={ticketLabel}>{label}</Text>
                <Text style={{ ...ticketValue, wordBreak: 'break-word' }}>{value}</Text>
              </Column>
            ))}
          </Row>
        ))}
      </Section>
      <Section style={{ borderTop: `2px dashed ${COLORS.muted}`, padding: '18px 20px 20px' }}>
        <Row>
          {qrAlt && (
            <Column style={{ verticalAlign: 'middle', width: 136 }}>
              <Img
                src={qrSrc}
                alt={qrAlt}
                width={120}
                height={120}
                style={{ background: COLORS.white, borderRadius: 10, padding: 6 }}
              />
            </Column>
          )}
          <Column style={{ paddingLeft: qrAlt ? 16 : 0, verticalAlign: 'middle' }}>
            <Text style={ticketLabel}>{ticket.stub.label}</Text>
            <Text style={{ ...display, color: COLORS.white, fontSize: 28, margin: '2px 0 0' }}>
              {ticket.stub.value}
            </Text>
          </Column>
        </Row>
      </Section>
    </Section>
  );
}

/** Props of {@link EmailBody}. */
export interface EmailBodyProps {
  /** The localized content. */
  content: EmailContent;
  /** Image source of the ticket QR. Defaults to the inline attachment. */
  qrSrc?: string;
}

/**
 * The visible body of a transactional email. Emails are light-only.
 *
 * @remarks
 * The brand is drawn with text, because no public image host exists yet and most
 * clients block embedded SVG.
 *
 * @param props - The content and the QR source.
 * @returns The email body.
 */
export function EmailBody({ content, qrSrc = `cid:${QR_CONTENT_ID}` }: EmailBodyProps) {
  const hasPanels =
    content.details.length > 0 ||
    Boolean(content.ticket || content.callout || content.highlight || content.sections);
  const sections = content.sections?.map((section) => (
    <Section key={section.title} style={panel}>
      <Heading
        as="h2"
        style={{
          ...display,
          color: COLORS.ink,
          fontSize: 20,
          fontStyle: 'normal',
          margin: '0 0 6px',
        }}
      >
        {section.title}
      </Heading>
      {section.body && (
        <Text style={{ color: COLORS.ink, fontSize: 15, lineHeight: '23px', margin: '4px 0' }}>
          {section.body}
        </Text>
      )}
      {section.details && <DetailRows rows={section.details} />}
      {section.note && (
        <Text style={{ color: COLORS.muted, fontSize: 15, lineHeight: '23px', margin: '4px 0' }}>
          {section.note}
        </Text>
      )}
    </Section>
  ));

  return (
    <Container
      style={{
        background: COLORS.white,
        borderRadius: 18,
        fontFamily: BODY_FONT,
        margin: '0 auto',
        maxWidth: 560,
        overflow: 'hidden',
      }}
    >
      <Section style={{ background: COLORS.red }}>
        <Text
          aria-hidden="true"
          data-skip-in-text="true"
          style={{
            color: COLORS.ink,
            fontSize: 12,
            lineHeight: '26px',
            margin: 0,
            overflow: 'hidden',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {RIBBON_DOTS}
        </Text>
      </Section>
      <Section style={{ padding: '24px 24px 4px' }}>
        <Row>
          <Column>
            <Text
              style={{ ...display, color: COLORS.ink, fontSize: 22, lineHeight: '22px', margin: 0 }}
            >
              CATARINOTLÓN
              <br />
              <span style={{ color: COLORS.red }}>2026</span>
            </Text>
          </Column>
          {content.badge && (
            <Column align="right">
              <span
                style={{
                  background: COLORS.ink,
                  borderRadius: 999,
                  color: COLORS.white,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1,
                  padding: '6px 14px',
                }}
              >
                {content.badge}
              </span>
            </Column>
          )}
        </Row>
      </Section>
      <Section style={{ padding: '12px 24px 24px' }}>
        <Heading
          as="h1"
          style={{
            ...display,
            color: COLORS.ink,
            fontSize: 36,
            lineHeight: '40px',
            margin: '0 0 12px',
          }}
        >
          {content.title}
        </Heading>
        <Text style={{ color: COLORS.ink, fontSize: 16, lineHeight: '25px', margin: '0 0 8px' }}>
          {content.body}
        </Text>
        {content.highlight && (
          <Text
            style={{
              ...panel,
              ...display,
              color: COLORS.ink,
              fontSize: 32,
              padding: 28,
              textAlign: 'center',
            }}
          >
            {content.highlight}
          </Text>
        )}
        {content.ticket && (
          <TicketCard ticket={content.ticket} qrAlt={content.qrAlt} qrSrc={qrSrc} />
        )}
        {content.callout && (
          <Section
            style={{
              border: `2px solid ${COLORS.ink}`,
              borderRadius: 12,
              margin: '16px 0',
              padding: '14px 20px',
            }}
          >
            <Text
              style={{
                ...display,
                color: COLORS.ink,
                fontSize: 18,
                fontStyle: 'normal',
                margin: 0,
              }}
            >
              {content.callout.title}
            </Text>
            <Text style={{ color: COLORS.ink, fontSize: 15, margin: '4px 0 0' }}>
              {content.callout.body}
            </Text>
          </Section>
        )}
        {content.details.length > 0 && (
          <Section style={panel}>
            <DetailRows rows={content.details} />
          </Section>
        )}
        {!content.sectionsAfterActions && sections}
        {content.lead && (
          <Text style={{ color: COLORS.ink, fontSize: 15, lineHeight: '23px', margin: '14px 0' }}>
            {content.lead}
          </Text>
        )}
        {content.cta && (
          <Button
            href={content.cta.url}
            style={{
              ...ctaBase,
              ...display,
              background: COLORS.red,
              display: hasPanels ? 'block' : 'inline-block',
              fontSize: 19,
              margin: '12px 0',
            }}
          >
            {content.cta.label}
          </Button>
        )}
        {content.sectionsAfterActions && sections}
        {content.note && (
          <Text
            style={{ color: COLORS.muted, fontSize: 14, lineHeight: '21px', margin: '12px 0 0' }}
          >
            {content.note}
          </Text>
        )}
        {content.contactLine && (
          <Text
            style={{ color: COLORS.muted, fontSize: 14, lineHeight: '21px', margin: '12px 0 0' }}
          >
            {content.contactLine}
          </Text>
        )}
      </Section>
      <Hr style={{ borderColor: COLORS.line, margin: 0 }} />
      <Section style={{ padding: '16px 24px 22px' }}>
        <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: '19px', margin: 0 }}>
          {content.footer}
        </Text>
        {content.footerContact && (
          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: '19px', margin: 0 }}>
            {content.footerContact}
          </Text>
        )}
      </Section>
    </Container>
  );
}

/** Props of {@link TransactionalEmail}. */
export interface TransactionalEmailProps {
  /** The email's locale. */
  locale: string;
  /** The localized content. */
  content: EmailContent;
}

/**
 * The complete document of a transactional email.
 *
 * @param props - The locale and the content.
 * @returns The email document.
 */
export function TransactionalEmail({ locale, content }: TransactionalEmailProps) {
  return (
    <Html lang={locale}>
      <Head>
        <title>{content.title}</title>
      </Head>
      <Body
        style={{ background: COLORS.page, fontFamily: BODY_FONT, margin: 0, padding: '24px 12px' }}
      >
        <InboxPreview text={content.body} />
        <EmailBody content={content} />
      </Body>
    </Html>
  );
}

/**
 * The hidden line inbox lists show next to the subject.
 *
 * @remarks
 * Replaces React Email's `Preview`, which pads the text with up to 200
 * invisible characters. Outlook's spam filter penalizes that padding, so the
 * preview carries only the opening paragraph.
 */
function InboxPreview({ text }: { text: string }) {
  return (
    <div
      data-skip-in-text="true"
      style={{
        display: 'none',
        overflow: 'hidden',
        lineHeight: '1px',
        opacity: 0,
        maxHeight: 0,
        maxWidth: 0,
      }}
    >
      {text}
    </div>
  );
}
