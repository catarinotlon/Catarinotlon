import 'server-only';

import { get as getBlob } from '@vercel/blob';
import { headers } from 'next/headers';
import { createFormatter } from 'next-intl';
import QRCode from 'qrcode';

import { getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import {
  isPaymentOpen,
  readEventSettings,
  updateEventSettings,
  type EventSettingsValues,
  type UpdateEventSettingsInput,
} from '@/modules/event';
import { DrizzleEventSettingsRepository } from '@/modules/event/infrastructure/drizzle-event-settings-repository';
import {
  adminEmailList,
  eraseAccountData,
  eraseManualRegistration,
  grantAdmin,
  parseAdminEmails,
  requireAdmin,
  requireOwner,
  requireUser,
  revokeAdmin,
} from '@/modules/identity';
import { BetterAuthAccounts } from '@/modules/identity/infrastructure/better-auth-accounts';
import { BetterAuthCurrentUserProvider } from '@/modules/identity/infrastructure/better-auth-current-user-provider';
import { DrizzleAccountDirectory } from '@/modules/identity/infrastructure/drizzle-account-directory';
import { DrizzleAdminGrantRepository } from '@/modules/identity/infrastructure/drizzle-admin-grant-repository';
import { DrizzlePersonalDataEraser } from '@/modules/identity/infrastructure/drizzle-personal-data-eraser';
import {
  authorizeReceiptRead,
  buildAccountOverview,
  buildAdminRows,
  buildPaymentSummary,
  confirmPaymentReview,
  registerManually,
  rejectPaymentReview,
  replacePaymentReceipt,
  submitReceipt,
  type PaymentContacts,
  type PaymentLinks,
  type PaymentRepositories,
  type ReceiptFile,
  type RegisterManuallyInput,
} from '@/modules/payments';
import { DrizzlePaymentRepository } from '@/modules/payments/infrastructure/drizzle-payment-repository';
import { LocalReceiptStorage } from '@/modules/payments/infrastructure/local-receipt-storage';
import { VercelBlobReceiptStorage } from '@/modules/payments/infrastructure/vercel-blob-receipt-storage';
import {
  adminEditRegistration,
  changeRunnerDistance,
  changeRunnerShirtName,
  changeRunnerShirtSize,
  listAccountRunners,
  registerRunner,
  sendRaceReminders,
  type AdminEditInput,
  type RegisterRunnerInput,
  type RegistrationAuditLog,
  type RegistrationRepository,
  type RegistrationSettingsReader,
  type RunnerEdit,
} from '@/modules/registration';
import { DrizzleRegistrationAuditLog } from '@/modules/registration/infrastructure/drizzle-registration-audit-log';
import { DrizzleRegistrationRepository } from '@/modules/registration/infrastructure/drizzle-registration-repository';
import {
  deliverKit,
  downloadTicketPdf,
  findKitByTicket,
  ticketQrPayload,
  undoKitDelivery,
  type Ticket,
  type TicketFactsReader,
} from '@/modules/ticketing';
import { DrizzleKitPickupRepository } from '@/modules/ticketing/infrastructure/drizzle-kit-pickup-repository';
import { DrizzleTicketRepository } from '@/modules/ticketing/infrastructure/drizzle-ticket-repository';
import { ReactPdfTicketRenderer } from '@/modules/ticketing/infrastructure/react-pdf-ticket-renderer';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';
import { isAuthorizedCronRequest } from '@/shared/infrastructure/cron-auth';
import {
  auth,
  emailSender as emails,
  errorReporter as reporter,
} from '@/shared/infrastructure/auth/instance';
import { db } from '@/shared/infrastructure/db/client';
import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { env, isProduction } from '@/shared/infrastructure/env';
import {
  CryptoIdGenerator,
  CryptoRandomSource,
  SystemClock,
} from '@/shared/infrastructure/system-adapters';

const clock = new SystemClock();
const ids = new CryptoIdGenerator();
const random = new CryptoRandomSource();
const getHeaders = async () => new Headers(await headers());

const settings = new DrizzleEventSettingsRepository(db);
const registrations = new DrizzleRegistrationRepository(db);
const payments = new DrizzlePaymentRepository(db, ids);
const tickets = new DrizzleTicketRepository(db);
const pickups = new DrizzleKitPickupRepository(db);
const directory = new DrizzleAccountDirectory(db);
const eraser = new DrizzlePersonalDataEraser(db);

/** Account operations for the identity forms. */
export const accounts = new BetterAuthAccounts(auth, getHeaders);

const currentUser = new BetterAuthCurrentUserProvider(
  (input) => auth.api.getSession(input),
  getHeaders,
);

const adminGrants = new DrizzleAdminGrantRepository(db);
const owners = () => parseAdminEmails(env.ADMIN_EMAILS);
const adminTeamDeps = () => ({ grants: adminGrants, owners: owners(), ids, clock });
const adminEmails = () => adminEmailList({ grants: adminGrants, owners: owners() });

/** The site's public origin, for links and metadata that must be absolute. */
export const siteUrl = new URL(env.BETTER_AUTH_URL);

const absolute = (href: Parameters<typeof getPathname>[0]['href'], locale: string) =>
  `${env.BETTER_AUTH_URL}${getPathname({ href, locale: locale as AppLocale })}`;

const links: PaymentLinks = {
  account: (locale) => absolute('/account', locale),
  payment: (locale) => absolute('/payment', locale),
  adminPayment: (paymentId, locale) =>
    absolute({ pathname: '/admin/payments/[id]', params: { id: paymentId } }, locale),
  ticketPdf: (ticketId, locale) =>
    `${env.BETTER_AUTH_URL}/api/tickets/${ticketId}/pdf?locale=${locale}`,
};

const contacts: PaymentContacts = {
  accountHolder: (userId) => directory.accountHolder(userId),
  adminEmails,
};

const paymentRepositories = (client: DatabaseClient): PaymentRepositories => ({
  payments: new DrizzlePaymentRepository(client, ids),
  registrations: new DrizzleRegistrationRepository(client),
  tickets: new DrizzleTicketRepository(client),
});

const paymentUnitOfWork: UnitOfWork<PaymentRepositories> = {
  run: (work) => db.transaction((tx) => work(paymentRepositories(tx))),
};

const auditUnitOfWork: UnitOfWork<{
  readonly registrations: RegistrationRepository;
  readonly audit: RegistrationAuditLog;
}> = {
  run: (work) =>
    db.transaction((tx) =>
      work({
        registrations: new DrizzleRegistrationRepository(tx),
        audit: new DrizzleRegistrationAuditLog(tx),
      }),
    ),
};

/**
 * Reads the current event settings.
 *
 * @returns The latest values, or empty settings before the first save.
 */
export const getEventSettings = (): Promise<EventSettingsValues> => readEventSettings({ settings });

const registrationSettings: RegistrationSettingsReader = {
  read: async () => {
    const values = await getEventSettings();
    if (values.feeCents === null || values.shirtSizes.length === 0) return null;
    return { feeCents: values.feeCents, shirtSizes: values.shirtSizes };
  },
};

const shirtRules = {
  read: async () => {
    const values = await getEventSettings();
    return {
      deadline: values.shirtSizeDeadline ? new Date(values.shirtSizeDeadline) : null,
      shirtSizes: values.shirtSizes,
    };
  },
};

const runnerEditDeps = {
  registrations,
  emails,
  reporter,
  clock,
  ids,
  shirtRules,
  contact: { emailOf: (userId: string) => directory.emailOf(userId) },
  links: { account: links.account },
};

const paymentDeps = {
  unitOfWork: paymentUnitOfWork,
  availability: { isOpen: async () => isPaymentOpen(await getEventSettings()) },
  contacts,
  links,
  emails,
  reporter,
  clock,
  ids,
};

/** Resolves the signed-in user, or an expected error. */
export const getSignedInUser = () => requireUser({ currentUser });

/** Resolves the signed-in admin, deriving the role on every call. */
export const getAdminUser = async () =>
  requireAdmin({ currentUser, adminEmails: await adminEmails() });

/** Resolves the signed-in owner, the only admin who manages other admins. */
export const getOwnerUser = () => requireOwner({ currentUser, owners: owners() });

/**
 * Whether the signed-in user is an owner.
 *
 * @returns `true` for an owner with a verified address.
 */
export const isOwner = async (): Promise<boolean> => (await getOwnerUser()).ok;

/**
 * Lists the admin team: the owners from `ADMIN_EMAILS` and the added admins.
 *
 * @returns The owners' addresses and the active grants.
 */
export const getAdminTeam = async () => ({
  owners: owners(),
  admins: await adminGrants.listActive(),
});

/** Gives an address access to the admin panel. */
export const addAdmin = (input: { ownerId: string; email: string }) =>
  grantAdmin(adminTeamDeps(), input);

/** Removes an added admin. */
export const removeAdmin = (input: { ownerId: string; grantId: string }) =>
  revokeAdmin(adminTeamDeps(), input);

/** Contact data and legal acceptance storage. */
export const accountDirectory = directory;

/** Whether cookies must be HTTPS-only. */
export const secureCookies = isProduction;

/** The system clock. */
export const appClock = clock;

/** The UUID source. */
export const appIds = ids;

/** Registers a runner under an account. */
export const registerAccountRunner = (input: RegisterRunnerInput) =>
  registerRunner({ registrations, settings: registrationSettings, clock, ids, random }, input);

/** Lists the runners of an account. */
export const listRunners = (userId: string) => listAccountRunners({ registrations }, { userId });

/** Lists every registration, for admins. */
export const listAllRegistrations = () => registrations.listAll();

/** Finds a registration by ID, for admins. */
export const findRegistration = (id: string) => registrations.findById(id);

/** Changes a runner's shirt name. */
export const changeShirtNameFor = (input: RunnerEdit & { shirtName: string }) =>
  changeRunnerShirtName(runnerEditDeps, input);

/** Changes a runner's distance. */
export const changeDistanceFor = (input: RunnerEdit & { distance: string }) =>
  changeRunnerDistance(runnerEditDeps, input);

/** Changes a runner's shirt size. */
export const changeShirtSizeFor = (input: RunnerEdit & { shirtSize: string }) =>
  changeRunnerShirtSize(runnerEditDeps, input);

/** Corrects a registration as an admin. */
export const adminEdit = (input: AdminEditInput) =>
  adminEditRegistration(
    {
      unitOfWork: auditUnitOfWork,
      emails,
      reporter,
      clock,
      ids,
      shirtSizes: { read: async () => (await getEventSettings()).shirtSizes },
      contact: runnerEditDeps.contact,
      links: runnerEditDeps.links,
    },
    input,
  );

/** Registers someone by hand, as an admin. */
export const adminRegister = (input: RegisterManuallyInput) =>
  registerManually(
    {
      unitOfWork: paymentUnitOfWork,
      settings: registrationSettings,
      emails,
      reporter,
      clock,
      ids,
      random,
    },
    input,
  );

/** Records a receipt covering the account's unpaid runners. */
export const submitAccountReceipt = (input: { ownerId: string; receipt: ReceiptFile }) =>
  submitReceipt(paymentDeps, input);

/** Replaces the receipt of a payment under review. */
export const replaceAccountReceipt = (input: {
  userId: string;
  paymentId: string;
  receipt: ReceiptFile;
}) => replacePaymentReceipt(paymentDeps, input);

/** Authorizes reading a stored receipt. */
export const authorizeReceipt = (input: {
  userId: string;
  isAdmin: boolean;
  paymentId: string;
  pathname: string;
}) => authorizeReceiptRead({ payments }, input);

/** Lists an account's payments. */
export const listAccountPayments = (ownerId: string) => payments.listByOwner(ownerId);

/** Finds a payment, for admins. */
export const findPayment = (id: string) => payments.findById(id);

/** Confirms a payment as an admin. */
export const confirmPayment = (input: { paymentId: string; adminId: string }) =>
  confirmPaymentReview(paymentDeps, input);

/** Rejects a payment as an admin. */
export const rejectPayment = (input: { paymentId: string; adminId: string; reason: string }) =>
  rejectPaymentReview(paymentDeps, input);

/** Finds a ticket by registration. */
export const findTicketForRegistration = (registrationId: string) =>
  tickets.findByRegistration(registrationId);

/** Finds a ticket by its UUID. */
export const findTicket = (ticketId: string) => tickets.findById(ticketId);

const kitDeps = { registrations, tickets, pickups, clock, ids };

/** Finds the kit of a scanned ticket. */
export const findKit = (ticketId: string) => findKitByTicket(kitDeps, { ticketId });

/** Finds the delivery in effect for a registration. */
export const activePickup = (registrationId: string) => pickups.activeFor(registrationId);

/** Marks a kit as delivered. */
export const markKitDelivered = (input: {
  adminId: string;
  registrationId: string;
  collectedBy?: string;
}) => deliverKit(kitDeps, input);

/** Undoes a kit delivery. */
export const undoKit = (input: { adminId: string; registrationId: string }) =>
  undoKitDelivery(kitDeps, input);

/** Saves the event settings as a new version. */
export const saveEventSettings = (input: UpdateEventSettingsInput) =>
  updateEventSettings(
    {
      settings,
      passwords: { verify: (userId, password) => accounts.verify(userId, password) },
      admins: { adminEmails },
      links: { settings: (locale) => absolute('/admin/settings', locale) },
      emails,
      reporter,
      clock,
      ids,
    },
    input,
  );

/** Lists the event settings history, newest first. */
export const eventSettingsHistory = () => settings.history();

/** Anonymizes an account in place, as an admin. */
export const eraseAccount = (input: { adminId: string; userId: string }) =>
  eraseAccountData({ eraser, clock, ids }, input);

/** Anonymizes a registration that has no account, as an admin. */
export const eraseManualRegistrationData = (input: { adminId: string; registrationId: string }) =>
  eraseManualRegistration({ eraser, clock, ids }, input);

const localReceipts = new LocalReceiptStorage(env.RECEIPT_LOCAL_DIR);

/** Where receipts are uploaded: the private Blob store, or the local disk. */
export const receiptUploadMode: 'blob' | 'local' =
  env.RECEIPT_STORAGE === 'memory' ? 'local' : 'blob';

/** Reads stored receipts. */
export const receiptStorage =
  receiptUploadMode === 'local'
    ? localReceipts
    : new VercelBlobReceiptStorage({
        get: async (pathname, options) => {
          const result = await getBlob(pathname, options);
          return result
            ? {
                statusCode: result.statusCode,
                stream: result.stream,
                blob: { contentType: result.blob.contentType, size: result.blob.size },
              }
            : null;
        },
      });

/**
 * Stores a receipt on the local disk. Only available outside the Blob store.
 *
 * @returns The local store, or `null` when receipts go to Blob.
 */
export const localReceiptStore = () => (receiptUploadMode === 'local' ? localReceipts : null);

/** The largest receipt accepted, in bytes. */
export const receiptMaxBytes = env.RECEIPT_MAX_BYTES;

const APP_TIME_ZONE = 'America/Mexico_City';
const MEXICO_CITY_UTC_OFFSET_HOURS = 6;

/**
 * Formats the event facts for one runner.
 *
 * @param values - The event settings.
 * @param distance - The runner's distance.
 * @param locale - The output locale.
 * @returns The formatted date, start time, venue, kit pickup, and route.
 */
export function formatRunnerFacts(values: EventSettingsValues, distance: string, locale: string) {
  const format = createFormatter({ locale: locale as AppLocale, timeZone: APP_TIME_ZONE });
  const time = values.startTimes[distance === '3K' ? '3K' : '5K'];
  const [hours = 0, minutes = 0] = (time ?? '').split(':').map(Number);
  const text = (item: { es: string; en: string } | null) =>
    (locale === 'en' ? item?.en : item?.es) || null;

  return {
    date: values.eventDate
      ? format.dateTime(new Date(`${values.eventDate}T12:00:00Z`), { dateStyle: 'long' })
      : null,
    start: time
      ? format.dateTime(
          new Date(Date.UTC(2026, 0, 1, hours + MEXICO_CITY_UTC_OFFSET_HOURS, minutes)),
          { hour: 'numeric', minute: '2-digit' },
        )
      : null,
    venue: text(values.venue),
    kitPickup: text(values.kitPickup),
    routeMapUrl: values.routeMapUrl,
  };
}

const ticketFacts: TicketFactsReader = {
  read: async ({ distance, locale }) => {
    const facts = formatRunnerFacts(await getEventSettings(), distance, locale);
    return { eventDate: facts.date, startTime: facts.start, venue: facts.venue };
  },
};

/** Renders a ticket's PDF for its owner or an admin. */
export const renderTicketPdf = (input: {
  userId: string;
  isAdmin: boolean;
  ticketId: string;
  locale: string;
}) =>
  downloadTicketPdf(
    { registrations, tickets, renderer: new ReactPdfTicketRenderer(), facts: ticketFacts },
    input,
  );

/** Builds the QR image of a ticket. It encodes only the ticket's UUID. */
export const ticketQrDataUrl = (ticket: Ticket) =>
  QRCode.toDataURL(ticketQrPayload(ticket), { margin: 1, width: 340 });

/** Loads the per-runner view of an account. */
export async function getAccountOverview(userId: string) {
  const [runners, accountPayments] = await Promise.all([
    registrations.listByOwner(userId),
    payments.listByOwner(userId),
  ]);
  const found = await Promise.all(runners.map((item) => tickets.findByRegistration(item.id)));
  return buildAccountOverview(
    runners,
    accountPayments,
    found.filter((item): item is Ticket => item !== null),
  );
}

/** Summarizes what an account still has to pay. */
export async function getPaymentSummary(userId: string, holderName: string) {
  return buildPaymentSummary(await registrations.listByOwner(userId), holderName);
}

/** Loads the rows of the admin registrations table. */
export async function getAdminRows() {
  const [allRegistrations, emailsByUser, allPayments, activePickups] = await Promise.all([
    registrations.listAll(),
    directory.emailsByUser(),
    payments.listAll(),
    pickups.listActive(),
  ]);
  return buildAdminRows(allRegistrations, emailsByUser, allPayments, activePickups);
}

/** Checks the bearer secret of a scheduled job. */
export const authorizeCron = (request: Request) =>
  isAuthorizedCronRequest(request, env.CRON_SECRET);

/** Today's date in the event's time zone, `YYYY-MM-DD`. */
const eventToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE }).format(clock.now());

/**
 * Sends today's race reminder, if today is three days or one day before the race.
 *
 * @returns How many reminders went out and which reminder day today is.
 */
export const sendReminders = async () =>
  sendRaceReminders(
    {
      registrations,
      emails,
      reporter,
      contact: runnerEditDeps.contact,
      links: runnerEditDeps.links,
    },
    { eventDate: (await getEventSettings()).eventDate, today: eventToday() },
  );
