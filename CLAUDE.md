# Catarinotlón

Web app for the **Catarinotlón 2026** race (3K and 5K). Runners read about the event, create an account, register for a distance, choose the name printed on the back of their shirt, and get a ticket they can download as a PDF. Every runner receives a personalized shirt, and a medal at the finish line: a finisher medal, or a podium medal for the top three of each distance.

> **Repo status:** scaffolded and implemented. This file is the contract (stack, structure, scripts, rules) that everything here must follow. If something here stops being true, update this file in the same change.
>
> **Pinned below latest on purpose:** TypeScript 6.0 (TypeDoc and typescript-eslint do not support 7 yet) and ESLint 9 (`eslint-plugin-react`, used by `eslint-config-next`, does not support 10). pnpm enforces a one-day minimum release age: do not add exclusions to get around it.

## Non-negotiable rules

1. **The name is "Catarinotlón"** (with "tl"). Never "Catarinotón", even though the product photos say so. It is a proper name and is never translated. In identifiers and paths: `catarinotlon`.
2. **Everything is written in English**: identifiers, file names, comments, TSDoc, Storybook docs, tests, commit messages, PR descriptions, and every doc file including this one. The only Spanish in the repo is user-facing copy inside `messages/es.json`.
3. **Hexagonal architecture.** The domain knows nothing about Next.js, React, Drizzle, Better Auth, Resend, Sentry, or next-intl. Dependencies always point inward.
4. **TDD is mandatory.** Every feature, bug fix, refactor, and behavior change is built test-first: red → green → refactor. Before writing any implementation code, invoke the `test-driven-development` skill and follow it. No production code without a failing test first (see "TDD workflow").
5. **Nothing ships without its tests and its documentation** (see "Definition of done").
6. **No hardcoded user-facing text.** Every string a user can read comes from the message files, in both English and Spanish.
7. **Do not invent event facts** (date, venue, prices, shirt sizes, rules). If a fact is missing, ask or leave it as pending configuration.
8. **Soft delete only.** No row is ever physically deleted from the database, and no uploaded file is ever removed (see "Soft delete").
9. **Always work in a git worktree.** Every change (feature, fix, docs) is made in its own worktree under `.claude/worktrees/<name>` on its own branch, never in the main checkout (see "Worktrees").
10. **Check current documentation before using an API** from Next.js, next-intl, next-themes, Better Auth, Drizzle, Turso, Vercel Blob, Storybook, Vitest, Playwright, Sentry, Resend, React Email, Tailwind, or TypeDoc (Context7). These tools change fast; do not rely on memory.

## Stack

| Area                  | Choice                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | Next.js (App Router, latest stable) + React, deployed on Vercel (Node.js runtime, not Edge)                                                                                                  |
| Language              | TypeScript in `strict` mode (plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`)                                                                                               |
| Package manager       | pnpm · Node 24 LTS (minimum 22)                                                                                                                                                              |
| Internationalization  | next-intl, locales `en` and `es`                                                                                                                                                             |
| Styling               | Tailwind CSS v4 (tokens in CSS via `@theme`), `class-variance-authority` + `tailwind-merge` for variants                                                                                     |
| Theming               | next-themes, light and dark themes, light by default                                                                                                                                         |
| Base components       | shadcn/ui (Radix primitives) copied into `src/shared/ui` and adapted to the brand                                                                                                            |
| Validation            | Zod at the edges (forms, environment variables, external payloads)                                                                                                                           |
| Environment variables | `@t3-oss/env-nextjs` (Zod schema, build fails if something is missing)                                                                                                                       |
| Database              | Turso (libSQL/SQLite) with **Drizzle ORM** (`drizzle-orm/libsql`, `@libsql/client`) and `drizzle-kit` (`dialect: 'turso'`)                                                                   |
| Authentication        | Better Auth with its Drizzle adapter (`provider: "sqlite"`): email + password and Google sign-in                                                                                             |
| Email                 | Resend + React Email for templates                                                                                                                                                           |
| Tickets               | `qrcode` (QR) and `@react-pdf/renderer` (PDF download)                                                                                                                                       |
| Payments              | Bank transfer, "Transferencia (SPEI)", with a receipt upload reviewed by an admin. No payment gateway                                                                                        |
| File storage          | Vercel Blob, private store, client uploads (`@vercel/blob`)                                                                                                                                  |
| Bot protection        | Cloudflare Turnstile on the email sign-up, sign-in, password reset request, and verification resend forms (managed widget, `interaction-only`), verified on the server; off without its keys |
| Error tracking        | Sentry (`@sentry/nextjs`)                                                                                                                                                                    |
| Product analytics     | PostHog (`posthog-js`, US Cloud): pageviews, clicks, and session replay, through the `/ingest` proxy; off without `NEXT_PUBLIC_POSTHOG_KEY`                                                  |
| Testing               | Vitest + Testing Library (unit and integration), MSW (external HTTP), Storybook Vitest addon (components), Playwright + axe (E2E)                                                            |
| Documentation         | TypeDoc (code API) and Storybook (components)                                                                                                                                                |
| Quality               | ESLint (flat config, `eslint-config-next`, `eslint-plugin-boundaries`), Prettier (`prettier-plugin-tailwindcss`), lefthook + lint-staged, Conventional Commits                               |

When scaffolding, install the latest stable versions and pin them in `package.json`. Do not add new dependencies without a reason; prefer the platform and what is already in the stack.

## Hexagonal architecture

```
messages/                     en.json, es.json (user-facing copy)
src/
  app/[locale]/               Next.js App Router: routes, layouts, metadata. Composition only; no business rules.
  app/api/auth/[...all]/      Better Auth route handler (not localized)
  i18n/                       next-intl setup: routing.ts, navigation.ts, request.ts
  proxy.ts                    next-intl locale routing
  modules/
    <module>/                 One bounded context per folder: event, identity, registration, payments, ticketing
      domain/                 Entities, value objects, domain errors and events. Pure TypeScript.
      application/
        ports/                Interfaces the module needs from the outside (repositories, email, clock…)
        use-cases/            One use case per file. Orchestrates domain + ports.
      infrastructure/         Driven adapters: Drizzle, Resend, etc. They implement ports.
      presentation/           Driving adapters: server actions, Zod schemas, DTO mappers, module components
      index.ts                Public API of the module. The only thing other modules may import.
  shared/
    domain/                   Result, base errors, common value objects
    infrastructure/           DB client and Drizzle schema, env, Better Auth instance, Resend and Sentry clients
    ui/                       Design system: reusable components + stories
  composition/                Composition root: wires ports to adapters and exposes the use cases
drizzle/                      Generated migrations (committed)
e2e/                          Playwright tests
.storybook/                   Storybook configuration
```

### Dependency direction (enforced by `eslint-plugin-boundaries`)

- `domain` imports nothing outside `domain` and `shared/domain`. No frameworks, no Zod, no I/O, no direct `Date.now()` or `crypto` (use the `Clock` and `IdGenerator` ports).
- `application` imports `domain` and its own `ports`. Never concrete adapters.
- `infrastructure` and `presentation` import `application` and `domain`. They do not import each other.
- `app/` imports `presentation`, `shared/ui`, and `composition`. Never `infrastructure` directly.
- Across modules, import only from `modules/<other>/index.ts`.

### Conventions

- **Ports** are named after a capability: `RegistrationRepository`, `EmailSender`, `ErrorReporter`, `Clock`.
- **Adapters** are named after a technology: `DrizzleRegistrationRepository`, `ResendEmailSender`, `SentryErrorReporter`. Every port also has an in-memory double (`InMemoryRegistrationRepository`) for tests.
- **Use cases** receive their ports by constructor/parameter, return `Result<T, DomainError>` for expected failures, and throw only on unexpected ones.
- **Value objects** validate their invariants on construction (`Email`, `ShirtName`, `Distance`). An invalid value cannot exist.
- **Mappers** are explicit between DB row ↔ entity ↔ DTO. Entities do not cross into React, and Drizzle rows do not leave `infrastructure`.
- **Composition root** (`src/composition`) is marked `server-only`. It is the only place where adapters are instantiated.

### Next.js as an adapter

- Server Components by default; `'use client'` only on leaves that need state or events.
- **No dead waits.** Every button that waits on the server uses the shared `Button` `pending` state (or `SubmitButton`, which follows its form): a spinner, a label that says what is happening (`busy.*` messages), `aria-busy`, and no second submission. Every route that loads data has a `loading.tsx` with a skeleton from `src/shared/ui/skeleton.tsx` in the shape of the page.
- Mutations go through thin Server Actions: validate with Zod → call the use case → translate the `Result` into UI state. No business logic.
- No component or route queries the database: always through a use case.
- Every module that touches secrets or the DB imports `server-only`.

### Domain language

| Spanish (product term)               | Code                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Inscripción                          | `Registration`                                                                        |
| Corredor                             | `Runner`                                                                              |
| Distancia (3K, 5K)                   | `Distance`                                                                            |
| Playera, talla, nombre en la espalda | `Shirt`, `ShirtSize`, `ShirtName`                                                     |
| Medalla (de finalista, de podio)     | `Medal` (`FinisherMedal`, `PodiumMedal`)                                              |
| Kit del corredor                     | `RunnerKit`                                                                           |
| Cuenta                               | `Account` (the signed-in user is a `User`, referenced in the domain only by `UserId`) |
| Boleto                               | `Ticket`                                                                              |
| Número de corredor                   | `BibNumber`                                                                           |
| Pago, cuota                          | `Payment`, `RegistrationFee`                                                          |
| Transferencia (SPEI), comprobante    | `BankTransfer`, `TransferReceipt`                                                     |
| Entrega de kits                      | `KitPickup`                                                                           |
| Administrador                        | `Admin` (a role, not a separate account type)                                         |

## Product scope

| Area                              | Route                                                                     | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing                           | `/[locale]`                                                               | Event info: distances, runner kit, medals, race day, FAQ. Offers two actions everywhere: register (create account) or sign in. It has no registration form of its own, only a shirt-name "try it on" preview. A signed-in admin also gets an "Admin" link to the panel in its navigation.                                                                                                                                                                                                                                                 |
| Sign up                           | `/[locale]/sign-up`                                                       | Create an account with Google or email + password, and register: distance, shirt size, shirt name with a live shirt preview.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sign in                           | `/[locale]/sign-in`                                                       | Google or email + password. Link to password reset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Complete registration             | `/[locale]/register`                                                      | Signed-in only. Step 2 of 3: runner's full name (prefilled with the account holder's), distance, shirt size, phone, shirt name with live preview. Shown whenever the account has no registration yet, which is always the case after a first Google sign-in.                                                                                                                                                                                                                                                                              |
| Add another runner                | `/[locale]/account/runners/new`                                           | Signed-in only. Same form without the phone and the stepper: runner's full name, distance, shirt size, shirt name. The account holder's acceptance of the legal documents covers added runners, so this form does not ask again, even though the mock shows the checkbox. Returns to the account page.                                                                                                                                                                                                                                    |
| Payment                           | `/[locale]/payment`                                                       | Signed-in only. Step 3 of 3: bank transfer data, receipt upload, the list of the account's unpaid runners with the total (each with a "Remove" action that asks for confirmation first), an "add another runner before paying" action, and the administrator's contact card. The account holder can also leave and upload the receipt later from the account page.                                                                                                                                                                        |
| Account                           | `/[locale]/account`                                                       | Signed-in only. A "Your runners" picker (one card per runner plus "Add another runner"); everything below it belongs to the selected runner: status, ticket (QR, PDF download), shirt preview with editable name, race details, and, while the runner is unpaid, a "Remove" action that asks for confirmation first. Instead of the ticket it shows the payment panel with the receipt upload while payment is pending, the "we are validating your payment" panel while in review, and the rejection reason when a receipt was rejected. |
| Forgot / reset password           | `/[locale]/forgot-password`, `/[locale]/reset-password`                   | Request a reset link by email, "check your inbox" confirmation, and the form to set a new password. The request screen never reveals whether an email has an account.                                                                                                                                                                                                                                                                                                                                                                     |
| Verify email                      | `/[locale]/verify-email`                                                  | "Confirm your email" (with resend) after an email + password sign-up, and the "email confirmed" screen that continues to payment.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Legal                             | `/[locale]/privacy`, `/[locale]/terms`                                    | Privacy notice and terms and conditions. Linked from every footer and from the acceptance checkbox at sign-up.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Error and not found               | `error.tsx`, `not-found.tsx`                                              | Friendly error screen with retry, and a 404 screen. Both localized, both themes.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Admin: registrations              | `/[locale]/admin`                                                         | Admins only. Totals, search and filters, registrations table, exports (registrations, and shirt names by size for the printer).                                                                                                                                                                                                                                                                                                                                                                                                           |
| Admin: edit or add a registration | `/[locale]/admin/registrations/[id]`, `/[locale]/admin/registrations/new` | Admins only. Correct a runner's name, distance, shirt size, or shirt name; or register someone by hand, optionally marking the payment as already received.                                                                                                                                                                                                                                                                                                                                                                               |
| Admin: review payment             | `/[locale]/admin/payments/[id]`                                           | Admins only. The uploaded receipt next to the runners it covers, the expected amount, CLABE, and concept; confirm the payment or reject it with a reason.                                                                                                                                                                                                                                                                                                                                                                                 |
| Admin: event settings             | `/[locale]/admin/settings`                                                | Admins only. Edit the event data, the registration settings, the payment contact, and the protected bank data; shows what is still missing and the change history.                                                                                                                                                                                                                                                                                                                                                                        |
| Admin: kit pickup                 | `/[locale]/admin/kit-pickup`                                              | Admins only, mobile-first. Scan a ticket QR or search by name or bib number, see the runner's kit details, optionally note who is collecting, mark the kit as delivered (undoable).                                                                                                                                                                                                                                                                                                                                                       |
| Admin: admins                     | `/[locale]/admin/team`                                                    | Owners only. The owners and the added admins; add an admin by email or remove one. Everyone else, added admins included, gets "not found".                                                                                                                                                                                                                                                                                                                                                                                                |

### Accounts and runners

- **One account can register several people.** An account (`User`) owns one or more registrations; each registration is one runner with their own full name, distance, shirt size, shirt name, bib number, status, and ticket. Email and phone belong to the account holder, not to each runner.
- The first registration is prefilled with the account holder's name but can be for someone else.
- **The multi-runner UI must stay obvious:** the account page always shows the runner picker, even with one runner, with a visible "Add another runner" card. Everything below the picker clearly refers to the selected runner. Never show two runners' data mixed in one panel.
- Runner data is exactly what the mocks ask for. Do not add fields (birth date, gender, emergency contact) unless asked.

### Identifiers and bib numbers

- **Every entity ID is a UUID**, generated through the `IdGenerator` port. No auto-increment keys and no IDs derived from other data. Stored as text in SQLite.
- **The bib number is not an ID.** It is a 5-digit number (`10000`–`99999`), generated at random when the registration is created and never repeated: enforce it with a unique constraint in the database and retry on collision. Never reassign or recycle a number.
- The QR on the ticket encodes the ticket's UUID and nothing else. People look runners up by name or bib number.

### Registration lifecycle

`Registration` moves through four states:

1. **`incomplete`**: the account exists but has no registration yet. The account holder is sent to "Complete registration".
2. **`pending_payment`**: race details are saved. No ticket exists yet. The account page shows how to pay and the receipt upload.
3. **`payment_in_review`**: the runner uploaded a transfer receipt and an admin has not reviewed it yet. The account page shows the uploaded file and lets the runner replace it. A rejected receipt goes back to `pending_payment`.
4. **`confirmed`**: an admin confirmed the payment. The `Ticket` is issued and the "Registration confirmed" email is sent.

- Signing up with email + password collects the race details in the same form, so that path goes straight to `pending_payment`. Signing up with Google starts at `incomplete`.
- **Payment is only ever offered to a signed-in runner who has already registered.** No guest checkout, no paying from the landing page.
- A kit can only be marked as delivered for a `confirmed` registration.
- **There is no capacity limit**, neither in total nor per distance. Do not model "sold out".
- **The only deadline is for changing the shirt size**; its date is an event setting and not set yet. Distance and shirt name can be changed at any time, even after paying. There is no registration closing date and unpaid registrations never expire. Because the fee is the same for both distances, changing distance never affects the payment.
- **The shirt name has no restrictions for now**: no length limit, no character rules, no approval step. Treat it as untrusted text everywhere it is rendered.
- **The runner kit is the personalized shirt and the race bib** (the runner's `BibNumber`, worn on the shirt during the race), and it is collected **on race day**. The medal is not in the kit: it is handed out at the finish line. Wherever the app mentions the kit or its pickup (landing, FAQ, account, ticket, emails), it says both things.
- **Anyone can collect a kit by showing the runner's ticket.** Do not require the runner or an ID; kit pickup may record who collected it.
- A rejected receipt keeps the registration (and the runner's place); the account page shows the admin's reason and asks for a new receipt.
- **An unpaid runner added by mistake can be removed by the account holder**, from the payment page or the account page, always after a confirmation step. Only a registration in `pending_payment` (including after a rejected receipt) can be removed; once a receipt covers it (`payment_in_review`) or it is `confirmed`, it stays. Removing is a soft delete recorded with the account holder as `deletedBy`; the bib number is never reused. Removing the last runner returns the account to `incomplete`. This is not a cancellation: no money has been paid.

### Soft delete

There is no hard delete anywhere. "Deleting" means marking a row as deleted. Drizzle has no built-in soft delete, so it is enforced in three layers:

1. **Schema.** Every domain table has `deletedAt` (nullable timestamp; `null` means active) and `deletedBy` (nullable `UserId`), added through one shared column helper so no table can forget them.
2. **Repositories.** Ports expose `softDelete` (and `restore`), never `delete`. Every read excludes deleted rows by default; only use cases that explicitly need them (admin audit) ask for `includeDeleted`. The port contract suite proves it for both the in-memory double and the Drizzle adapter: a soft-deleted row is not returned, is not counted, and still exists.
3. **Database.** A `BEFORE DELETE` trigger on every domain table aborts the statement, so a hard delete fails even from raw SQL or a mistake. The triggers live in migrations. A test lists every table in the database and fails if one has no trigger and is not on the exemption list below. Lint also bans Drizzle's `.delete()`.

Rules that follow from it:

- **Uniqueness is decided per constraint.** A value that must never be reused keeps a normal unique index (the bib number). A value that may be reused after deletion uses a partial unique index, `WHERE deleted_at IS NULL`.
- **No `ON DELETE CASCADE`.** It would never fire. Soft-deleting an aggregate soft-deletes its children in the same use case and transaction (a registration and its ticket).
- **Soft delete is not a business state.** A rejected receipt or an unpaid registration is a state, not a deletion. Do not use `deletedAt` to model a workflow.
- The domain does not carry `deletedAt`: a soft-deleted entity is simply not found.
- **Migrations are additive.** Never drop a table or a column that holds data without the user's explicit OK.
- **The only exemption:** Better Auth's own `session` and `verification` tables. The library deletes those rows itself (sign-out, expired tokens), and keeping live credentials forever is a security liability. They get no soft-delete columns and no trigger, and they are the only names on the trigger test's exemption list. User accounts are never deleted: Better Auth's `deleteUser` stays disabled.
- **Erasure requests are honored by anonymizing in place.** When a person asks for their data to be erased, a dedicated use case overwrites their personal fields (name, email, phone, shirt name) with neutral placeholders and keeps the rows, their IDs, the bib numbers, and the payment records. It is irreversible, it is not a soft delete (the rows stay active unless also soft-deleted), and it records when it ran and who ran it. Never implement it as a `DELETE`.

### Medals

- **There are eight medals, all gold:** a finisher medal and three podium medals (1st, 2nd, 3rd place) for each distance, 3K and 5K. Every medal carries the event name, the year, the ladybug, and its distance; podium medals add laurels and the place.
- **A runner gets one medal.** The top three of each distance get the podium medal for their place; everyone else who finishes gets the finisher medal of their distance.
- The landing page has a "Medals" section with a 3K / 5K switch that shows the finisher medal and the three podium medals of the selected distance.
- The medals are the organizer's artwork, with their ribbons, as eight transparent images in `public/images/medals` served by one component parameterized by type, distance, and place. The organizer's source image misspells the name ("CATARINOTÓN", "CATARINOLÓN", "206"); the images in the app have the lettering corrected and always read "CATARINOTLÓN 2026".
- The app only shows the medals. It does not record race results or who won a podium: do not model timing, rankings, or medal assignment unless asked.

### Site header

- Every page shows the same header as the landing page: the section links (Distances, Runner kit, Race day, FAQ), which lead back to the landing sections from any other page, plus the language and theme switches.
- **Wide screens** (the "Pista" design): the logo, the section links inline (from `xl`; on the landing page the section in view is marked current with a red underline), then the language switch, the theme switch, a divider, and the account actions. Signed out: a plain "Sign in" link and the red "Register" pill. Signed in: an "Admin" chip for admins, and the account button (initials, plus the first name from `sm` up) whose menu lists the account's runners with their state (each opens the account page with that runner chosen), pays what is pending, adds another runner, links to the account, and signs out. There is no separate sign-out button in the header.
- **Phones** (below `md`): the header shows only the logo and the menu button. Its drawer (a modal dialog from the right) holds everything else: the section links with their icons, the admin link for admins, the theme and language switches, and either sign in and register or the account card. The card opens a second level, "Your account", with the same runner list, "Add another runner" (or "Complete your registration" without runners), "Pay pending" while payment is open, and sign out. Between `md` and `xl` the header keeps its controls and the menu button carries the section links.
- Every page uses this header with the site navigation, the admin panel included (its tabs go below the header); there is no separate admin header or badge. `SiteHeader` without a `navigation` keeps the theme switch and the account button on every screen size (with only the initials on phones), but no page should render it that way.
- Both menus get their data from one per-request read of the session in `src/app/[locale]/_chrome/session.ts`.
- Every time shown to users says whether it is morning or afternoon (`7:00 a. m.`, `7:00 AM`), through the shared formats in `src/i18n/start-time.ts`.

### Language switch

- Every page offers the language switch: an `ES | EN` control in the header on wide screens and in the menu drawer on phones, and a language link in the footer on every screen size.
- Switching keeps the runner on the same page and remembers the choice.

### Legal pages

- The privacy notice and the terms are **published as final** by the organizer (no draft label). Their open policy gaps were dropped on purpose; do not add new wording or fill gaps without the user. A gap that names an event setting (event date, venue, fee, shirt-size deadline, kit pickup, contact email) shows the organizer's current value and keeps its bracket while the setting is missing.
- Their text is content per locale, not code. Sign-up requires accepting both; store when the runner accepted and which version.

- The shirt preview renders the runner's chosen name over the back-of-shirt photo, uppercase, scaled down for long names. The same component is used on the landing, sign-up, and account pages.
- Route names are in English and localized per locale through next-intl `pathnames`.

## Internationalization (next-intl)

- **Locales:** `en` and `es` only, for now. Default locale: `es`. Add a locale only when asked.
- **Spanish by default:** a first visit always lands on `es`, whatever the browser language. Only the visitor's own choice, remembered in the locale cookie, or a URL that names a locale changes that.
- **Routing:** locale-prefixed routes under `src/app/[locale]/`, configured once with `defineRouting` in `src/i18n/routing.ts`. `src/proxy.ts` runs the next-intl routing. Validate the `locale` param in the root layout and call `setRequestLocale` in every layout and page, with `generateStaticParams`, so pages stay statically rendered.
- **Navigation:** import `Link`, `redirect`, `useRouter`, and `usePathname` from `src/i18n/navigation`, never from `next/link` or `next/navigation`.
- **Messages:** `messages/en.json` is the source of truth for keys and types (`AppConfig` augmentation for `Locale` and `Messages`). `messages/es.json` must have exactly the same keys; a test fails on any mismatch. Namespaces follow the module or component that owns the text. Use ICU syntax for plurals and interpolation; never concatenate translated fragments.
- **Formatting:** dates, times, numbers, and currency go through the next-intl formatters with an explicit time zone. No `toLocaleString` or manual formatting.
- **Hexagonal boundary:** `domain` and `application` never produce user-facing text. They return error codes and data; `presentation` maps them to message keys. Zod schemas return message keys too.
- **Emails:** store the runner's locale with the registration and render the React Email template in that locale.
- **Page metadata:** localized `generateMetadata`, `lang` on `<html>`, and `hreflang` alternates for both locales. Page titles name only the page ("Mi cuenta"); the locale layout's template adds `· Catarinotlón`, and only the landing sets an `absolute` title. A test fails if a page title message repeats the event name.
- **No bots, no AI:** the site is closed to every crawler, search engines and AI tools included, by decision of the organizer. Three layers say so: `src/app/robots.ts` (`Disallow: /` for everyone except the link-preview bots in `LINK_PREVIEW_BOTS`, which only draw the share card and never read `/api/`), the locale layout's `robots` metadata (`noindex, nofollow, noarchive, nosnippet, noimageindex`) for every page, and an `X-Robots-Tag` header on every path from `next.config.ts` (the same plus `noai, noimageai`). Pages never set their own `robots`, because it would replace the layout's. There is no sitemap, canonical, or structured data. Never add an AI crawler to `LINK_PREVIEW_BOTS`; a test checks it.
- **Icons:** `src/app/favicon.ico` and `src/app/icon.svg` (the ladybug alone; its head turns light in a dark browser tab), `src/app/apple-icon.png`, and the manifest icons in `public/icons/`, all from the SVG sources in `design/assets/icons/`. `src/app/manifest.ts` opens the site `standalone` from the home screen.
- **Phones:** the layout turns off iOS phone detection (`formatDetection.telephone`), which would turn the CLABE or a bib number into a call link. A phone that must be tappable gets an explicit `tel:` link (`telUrl`).
- **Shared links:** the locale layout sets `metadataBase` (the site origin) plus Open Graph and Twitter (`summary_large_image`) tags, so every page shares the same event card. Its 1200 × 630 image is `src/app/[locale]/opengraph-image.tsx`, which renders the `ShareCard` component from `src/shared/ui` with `ImageResponse` in each locale. Keep it free of personal data and of event facts that are still settings (date, venue, fee).

## Theming

- **Themes:** light and dark, both approved. **Light is the default**: a first visit always renders light, regardless of the OS preference. The user's choice is remembered.
- **Library:** next-themes. `ThemeProvider` wraps the app in `src/app/[locale]/layout.tsx` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, and `enableColorScheme={false}`; the color scheme comes from `globals.css` instead, `only light` on `:root` (so browsers with an automatic dark mode do not darken the light theme) and `dark` on `.dark`; `<html>` carries `suppressHydrationWarning`. Tailwind's `dark` variant is bound to that class with `@custom-variant dark (&:where(.dark, .dark *));`.
- **Tokens:** components use semantic tokens only (`background`, `foreground`, `primary`, `muted`, `border`…), defined as CSS variables for `:root` (light) and `.dark`. No raw hex values or palette classes inside components. Reach for a `dark:` utility only when a token cannot express the difference.
- **Theme switch:** a single `ThemeSwitch` component in `src/shared/ui`, in the site header on every page (inside the menu drawer on phones). In the header it is a real `<button>` with a localized accessible label that names the action ("Switch to dark theme") and shows a moon in light and a sun in dark; in the drawer its `segmented` variant offers both themes as radio choices. It is the only place that calls `setTheme`. It must be hydration-safe: the active theme is unknown on the server, so render a same-size placeholder until mounted (no layout shift, no hydration mismatch).
- **Every UI component must support both themes:**
  - Every story renders in light and dark (Storybook theme toolbar), and the a11y check passes in both.
  - Contrast is at least 4.5:1 for text in both themes. Brand red `#D42016` fails as small text on dark surfaces: use the `#FF5A4D` token for red text there.
  - Images, illustrations, and the logo have a variant that works on dark backgrounds.
  - No flash of the wrong theme on load.
  - The phone's browser bar matches the page: the layout's `viewport.themeColor` is the light background, and `ThemeColorSync` (`src/shared/ui`) copies the active theme's `--background` token into `<meta name="theme-color">` when the theme changes or a navigation rewrites the head. A `prefers-color-scheme` media query cannot do it, because the runner picks the theme in the app.
  - E2E covers the theme switch (toggle, persistence across reloads and navigation) and runs the axe check in both themes.
  - A component that only works in one theme is not done.
- **Email templates are light-only** unless asked otherwise.
- Domain and application know nothing about themes.

## Authentication (Better Auth)

- **Methods:** email + password (with email verification and password reset) and Google sign-in. Nothing else unless asked.
- **Placement:** the Better Auth instance lives in `src/shared/infrastructure/auth` and is mounted at `app/api/auth/[...all]/route.ts` with `toNextJsHandler`. It uses the Drizzle adapter on the same Turso database; its tables are part of the Drizzle schema and change only through generated migrations.
- **Hexagonal boundary:** Better Auth is infrastructure. The `identity` module exposes a `CurrentUserProvider` port (adapter: `BetterAuthCurrentUserProvider`, which reads the session with `auth.api.getSession` and the request headers). Use cases receive a `UserId`; they never import Better Auth. Other modules reference users only by `UserId`.
- **Authorization:** every use case that reads or changes a registration or ticket checks ownership against the current `UserId`. Protecting a page in the UI is not enough. The account route redirects signed-out visitors to sign-in.
- **Bot protection:** every email form that creates an account, tries a password, or sends an email carries Cloudflare Turnstile (`HumanCheck`, loaded from Cloudflare's script with no npm package): sign-up, sign-in, the password reset request (and its resend), and the verification resend. The widget is "Managed" in the Cloudflare dashboard and rendered `interaction-only`, so most people never see it and only a suspicious visitor gets a checkbox. Each server action validates the fields first and then checks the token through the `HumanVerifier` port (`CloudflareTurnstileVerifier`, which sends only the secret and the token); nothing happens until it passes. A checked token is spent, so the form starts a fresh challenge after every server answer. A form never reaches the server without a fresh token: a submission made while the challenge runs, after the token expired (phones pause background tabs), or after a failure is held with a "checking" message and sent by itself once the token arrives. When Cloudflare cannot finish the challenge or rejects the browser there is no checkbox to tick, so `HumanCheck` explains it next to the button and offers to try again; a person must never be left with an error and nothing to do. Better Auth's matching HTTP routes (`/sign-up/email`, `/sign-in/email`, `/request-password-reset`, `/send-verification-email`) are closed with `disabledPaths`, so the forms are the only way in; a new form of this kind adds its check and closes its route in the same change. Google sign-in needs no extra check. Without `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` the check is off; setting only one fails at startup.
- **Emails:** the verification and password-reset hooks send through the `EmailSender` port, with the templates listed under "Transactional emails".
- **UI:** the Google button follows Google's sign-in branding guidelines (official button and logo; the mocks use a neutral placeholder).
- **Tests:** unit and integration tests use an in-memory `CurrentUserProvider`. E2E signs in with email + password against the local database. Never automate the real Google consent screen.

## Payments

- **The only payment method is a bank transfer, always called "Transferencia (SPEI)" in Spanish copy** (runners know it by that name; do not shorten it to "SPEI" or "transferencia"). There is no payment gateway, no cards, and no online charge.
- **What the payment page shows** (signed-in runners only): beneficiary (the administrator's full name), bank, the 18-digit CLABE, the exact amount, the payment concept, and the receipt upload. The beneficiary, the CLABE, and the concept each have their own copy button that confirms what was copied.
- **One transfer can cover several runners.** A `Payment` (one receipt) covers all of the account's unpaid registrations at the moment it is uploaded; the amount is the fee times the number of runners it covers. Confirming or rejecting the payment applies to every registration in it. Runners added later need a new payment.
- **Runners can be added before paying.** Both the "Complete registration" step and the payment page offer "add another runner" before any transfer is made, so a family pays once. On narrow screens the list of runners to pay comes before the bank transfer data.
- **Payments are independent, and a new payment never touches what is already confirmed.** An account can have several payments, including more than one in review at the same time. A registration belongs to at most one active payment. Adding a runner after paying creates only that runner's pending registration: existing registrations, bib numbers, tickets, and PDFs are never regenerated or changed.
- Every payment from the same account carries the same concept. The admin tells them apart by the runners each one covers, the amount, and the date.
- **Payment concept:** `CATARINOTLON - <account holder's full name>`, for example `CATARINOTLON - SOFIA RAMIREZ`. It is generated, never typed by an admin: uppercase, plain ASCII with accents removed (this is the one place the event name is written without its accent, because bank concept fields reject special characters), and truncated to the concept length banks accept (check the current SPEI limit when implementing). The admin review screen shows the same expected concept.
- **Administrator contact card**, shown next to the payment data: full name, phone, email, contact hours, and a "Chat on WhatsApp" button that opens a `wa.me` link. All of it, and the bank data, comes from the event settings, has no default, and is never rendered for signed-out visitors.
- **Receipt:** after transferring, the runner uploads the transfer receipt (image or PDF) from the payment page or from the account page. They can replace it while it is under review. Validate file type and size on the server.
- **Review:** an admin opens the receipt, compares it with their bank, and confirms or rejects it. A rejection requires a reason, which is sent to the runner, and returns the registration to `pending_payment`. Record who reviewed it and when.
- **There is one registration fee, the same for 3K and 5K.** The amount is an event setting (see "Event settings"): never hardcode it and do not model a fee per distance. **Each registration stores the fee that was in force when it was created**; changing the price later affects only new registrations, never the amount an existing one owes or paid.
- **There are no cancellations and no refunds.** Do not build a cancel or refund flow. The terms and conditions state it. Removing an unpaid runner added by mistake (see "Registration lifecycle") is not a cancellation and is the only removal a runner can make.
- A registration becomes `confirmed` only through the admin's confirmation on the server. Uploading a receipt never confirms anything by itself.

### File storage

- **Uploaded files live in a private Vercel Blob store** (`@vercel/blob`, `access: 'private'`). Turso stores only the file's pathname and metadata (owner, content type, size, upload time). Never store file bytes in Turso.
- **Upload directly from the browser** with Blob client uploads. Do not send the file through a Server Action or route handler: Vercel Functions cap the request body at 4.5 MB. The token endpoint checks the session, the file type (image or PDF), and a size limit before issuing the upload token (limit is configurable; default 5 MB).
- Receipts are private financial documents: only the runner who uploaded one and admins may read it. Serve them through a route that checks that, then streams the private blob. Never expose a public URL.
- Blob is infrastructure: use it only from a `VercelBlobReceiptStorage` adapter behind the `ReceiptStorage` port, with an in-memory double for tests. Tests never touch the real store.
- **Receipts are kept indefinitely.** Never delete a receipt automatically, including rejected and replaced ones; keep them all linked to the registration. The privacy notice must say so.
- App images (shirt, medal, logo) are static assets in the repo, served with `next/image`. They never go in the database.

## Admin panel

- **Roles:** every user is a runner; some are also `admin`, and the admins in `ADMIN_EMAILS` are also **owners**. Admins sign in the same way as runners. There is no self-service way to become an admin.
- **How someone becomes an admin:** owners are the allowlist in configuration (`ADMIN_EMAILS`), a deploy-time action by whoever controls the environment; nobody can become or stop being an owner from the app. Owners, and only owners, add or remove other admins by email from the admin team page; these added admins are stored in `admin_grants` (removal is a soft delete that records who and when). Added admins can do everything in the panel except manage admins. Never add admins through the database by hand. A user is an admin only while their email is an owner's or has an active grant **and** that email is verified, so removing an address revokes access on the next request. The role is derived on the server on every admin request; it is never trusted from the client or cached in the session beyond that check. The admin emails (new receipts, bank data changes) go to the owners and the added admins, and an added admin is told by email when they are added.
- **Authorization:** every admin use case checks the role on the server. Hiding a link is not access control. Admin routes return "not found" to non-admins.
- **Data:** admins see runner personal data only where the task needs it (the registrations table and kit pickup). Exports are generated on the server, on request, and are never stored or logged.
- **Kit pickup** records who delivered the kit and when, optionally who collected it, and can be undone.
- **Editing a registration:** an admin can correct a runner's name, distance, shirt size, and shirt name, including the shirt size after the runner's deadline. Record who changed what and when; a changed shirt name sends the runner the "Shirt name updated" email.
- **Manual registration:** an admin can register someone by hand (for example, someone who paid in person), with an optional contact email and phone, and can mark the payment as already received so the registration is confirmed at once. Such a registration may have no account.
- **Receipt notification:** every uploaded receipt sends the "New receipt to review" email to the admins, so nobody has to watch the panel. The email never attaches the receipt.
- The admin panel follows the same rules as the rest of the app: both locales, both themes, TDD, stories.

## Event settings

The organizer, not a developer, owns the event's facts. Admins edit them from the panel and changes take effect on save, with no deploy.

- **What is a setting:** event date, start times, venue, kit pickup information, route map; registration fee, available shirt sizes, shirt-size change deadline; the payment contact (full name, phone, email, WhatsApp, contact hours); the bank data (beneficiary, bank, 18-digit CLABE).
- **What is not a setting:** who is an owner. `ADMIN_EMAILS` stays in the environment so nobody can grant themselves owner access from inside the app; added admins are managed by the owners on their own page, not in the event settings.
- **Storage:** settings live in the database behind an `EventSettingsRepository` port. Free-text settings shown to runners (venue, kit pickup, contact hours) are stored per locale, `es` and `en`.
- **History, never overwrite:** every change appends a new version with what changed, who changed it, and when. The current value is the latest version. This follows the soft-delete rule: no setting row is updated in place or removed.
- **The bank data is protected.** Changing the beneficiary, bank, or CLABE requires the admin to re-enter their password, sends an email to every admin, and is shown in the history. Validate that the CLABE has exactly 18 digits and a correct check digit.
- **Missing settings close what depends on them.** Until the fee and the bank data exist, payment is closed: the site shows "registration opening soon" instead of empty placeholders, and nobody can reach the transfer screen. Each feature states which settings it needs and degrades the same way. The settings screen lists what is still missing.
- The domain reads settings through the port and treats a missing one as an expected state, never as a crash.

## Tickets

- A confirmed registration has exactly one `Ticket`, identified by its UUID. The QR code encodes only that UUID: no name, email, or other personal data.
- The ticket is available two ways: on the account page and as a PDF download. The PDF carries the same data as the on-screen ticket, including the QR.
- **No wallet passes.** Apple Wallet and Google Wallet were dropped from scope: do not build them, add their libraries, or show "add to wallet" buttons.
- **Port:** `TicketPdfRenderer`, with an in-memory double. The PDF download is served by a route handler that checks ownership.
- **Libraries (approved):** `qrcode` for the QR and `@react-pdf/renderer` for the PDF. Check each one's current docs before using it.
- **PDF design:** a ticket with a tear-off stub (the "Boleto con talón" mock): the runner's details, their shirt with the printed name, and the finisher medal of their distance on the main part; the distance, the QR, and the bib on the red stub. Its fonts (Barlow, OFL) and images live in `src/modules/ticketing/infrastructure/pdf-assets/` and ship with the route through `outputFileTracingIncludes`. react-pdf reads PNG and JPG only, not WebP.

## Transactional emails

All are React Email templates sent through `EmailSender`, rendered in the runner's locale, light theme only, each with its own story.

| Email                             | Sent when                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify your email                 | An account is created with email + password                                                                                                                                                                       |
| Registration confirmed            | A registration is confirmed. Carries the ticket summary and the QR, and a button to that runner on the account page, where the PDF is downloaded (no direct PDF link)                                             |
| Your race is coming up            | Three days and one day before the race date the admin set (a daily Vercel Cron at 15:00 UTC, 9:00 in Mexico City). Kit pickup is on race day, so both carry the pickup details; there is no separate kit reminder |
| Shirt name updated                | The runner changes the shirt name from the account page                                                                                                                                                           |
| Reset your password               | The runner requests a password reset                                                                                                                                                                              |
| We received your receipt          | The runner uploads a transfer receipt                                                                                                                                                                             |
| Your receipt was rejected         | An admin rejects a receipt. Carries the admin's reason and a link to upload a new one                                                                                                                             |
| New receipt to review (to admins) | An account holder uploads a receipt. Carries who uploaded it, the runners it covers, the expected amount and concept, and a link to the review screen                                                             |
| You are now an admin              | An owner adds an admin from the team page. Carries who added them and a link to sign in with that address (Spanish, like every admin email)                                                                       |

Each send uses an idempotency key. An email never includes more personal data than the mock shows.

## TDD workflow

- **Skill:** `.claude/skills/test-driven-development` (vendored from Superpowers, MIT). Invoke it at the start of every feature, bug fix, refactor, or behavior change, before touching implementation code. If implementation code was written first, delete it and restart from the test.
- **Cycle:** RED: write one failing test for one behavior, run it, and watch it fail for the right reason. GREEN: write the minimal code to pass, run that test, then the suite. REFACTOR: clean up while staying green. Repeat.
- **Outside-in for features:** start with a failing acceptance test at the outermost level that expresses the behavior (a Playwright spec for a user flow, a story `play` test for a component). Then drive inward: unit tests for the use case and the domain, contract and integration tests for the adapters.
- **First test, by what you are changing:**

  | Change                                     | Test to write first                                                          |
  | ------------------------------------------ | ---------------------------------------------------------------------------- |
  | `domain` or `application`                  | Unit test with in-memory doubles                                             |
  | New port or adapter                        | Port contract suite, run against the in-memory double, then the real adapter |
  | Server action                              | Integration test with the real container                                     |
  | UI component                               | Story with a `play` function (the story comes before the component)          |
  | Page, async Server Component, or full flow | Playwright spec                                                              |
  | Bug fix                                    | A test that reproduces the bug at the lowest level that shows it             |

- **Running one test while iterating:** `pnpm test <path>`, `pnpm test:integration <path>`, `pnpm test:stories`, `pnpm test:e2e <spec>`. Run `pnpm check` before calling the change done.
- **Scope:** TDD applies to behavior. Files with no behavior of their own (configuration, generated migrations, translation copy, docs) need no test-first cycle. Skipping TDD for anything else requires the user's explicit OK, every time.
- **Reporting:** when you finish, say which tests you watched fail before implementing. Never claim a test-first cycle that did not happen.

## Testing

| Type        | What it covers                                                                                                                                                              | Where                                    | Tool                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| Unit        | `domain` and `application` with in-memory doubles. No I/O.                                                                                                                  | `*.test.ts` next to the code             | Vitest                 |
| Integration | Adapters against real or edge-simulated dependencies: Drizzle repositories on local libSQL with migrations applied, Resend with MSW, server actions with the real container | `*.integration.test.ts` next to the code | Vitest                 |
| Component   | Every story runs as a test; interactive ones have a `play` function and pass a11y                                                                                           | `*.stories.tsx`                          | Storybook Vitest addon |
| E2E         | Critical flows on the built app, desktop and mobile, in both locales, with an axe check in both themes                                                                      | `e2e/*.spec.ts`                          | Playwright             |

- Write each test at the lowest level that proves the behavior. E2E is only for full flows (view the landing page, sign up and register for 3K/5K with a shirt name, complete registration after a social sign-in, pay and get the ticket, pay later from the account, sign in, download the ticket, change the shirt name, admin marks a kit as delivered, a runner cannot open admin, validation errors, language switch, theme switch).
- **Port contract tests:** the same suite runs against the in-memory double and the real adapter so they cannot drift.
- `async` Server Components are not testable with Vitest: cover them with E2E.
- Do not mock your own code: use the in-memory doubles. Mock only at the external edge (HTTP with MSW).
- Components that read translations are rendered through a shared test helper that wraps them in `NextIntlClientProvider` with the real messages.
- Integration and E2E tests never touch remote Turso and never send real email: `file:`/`:memory:` database and a fake `EmailSender`.
- Minimum coverage: 90% in `domain` and `application`; 80% overall. A fixed bug lands with the test that reproduces it.

## Documentation

**TypeDoc (code).** Every exported symbol has a TSDoc comment: summary, `@param`, `@returns`, `@throws` where relevant, and `@example` on use cases and ports. Business rules go in `@remarks`. `typedoc.json` enables `validation.notDocumented` with `treatWarningsAsErrors`, so an undocumented export fails `pnpm docs:check`. Entry points: `src/modules` and `src/shared`; tests, stories, and `src/app` are excluded.

**Storybook (components).** Framework `@storybook/nextjs-vite`. Every component in `src/shared/ui` and `modules/*/presentation` has a `*.stories.tsx` with `tags: ['autodocs']`, one story per variant and relevant state (default, hover/focus, disabled, error, loading, empty), and prop descriptions via TSDoc. Global decorators provide `NextIntlClientProvider` with a locale toolbar and the theme class with a theme toolbar, so every story works in `en` and `es` and in light and dark. Brand tokens are documented in MDX pages under "Foundations".

## Definition of done

A change is ready when:

- [ ] It respects the dependency direction (boundaries lint is green).
- [ ] It was built test-first: each test was seen failing for the right reason before the code that makes it pass.
- [ ] It has tests at the right level and they pass.
- [ ] Every new or changed export has TSDoc and `pnpm docs:check` passes.
- [ ] Every new or changed component has up-to-date stories.
- [ ] Every user-facing string exists in both `messages/en.json` and `messages/es.json`.
- [ ] Components use semantic tokens only and work in both light and dark themes.
- [ ] Schema changes include their generated migration in `drizzle/`, and every new table has the soft-delete columns and its `BEFORE DELETE` trigger.
- [ ] `pnpm check` is green.

## Worktrees

- **Never work in the main checkout.** Before the first edit of any change, create a worktree on a new branch: `git worktree add .claude/worktrees/<name> -b <type>/<name>` from the branch the change starts from (usually `main`), and do all the work, tests, and commits there.
- `.claude/worktrees/` is ignored by git, ESLint, Prettier, and `tsc`, so one worktree's tools never read another's files. Each worktree needs its own `pnpm install` and its own `.env.local` (copy it; never commit it).
- Remove a worktree (`git worktree remove`) once its branch is merged or abandoned.

## Commits

- **Conventional Commits, always:** `type(scope): summary`. Types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`. The `commit-msg` hook rejects anything else.
- **Scope** is the module or area touched, in lowercase kebab-case: `event`, `identity`, `registration`, `payments`, `ticketing`, `shared`, `ui`, `i18n`, `db`, `email`, `auth`, `composition`, `app`, `api`, `e2e`, `design`.
- **Summary** is in English, imperative, lowercase, without a final period, at most 72 characters. Mark a breaking change with `!` and a `BREAKING CHANGE:` footer.
- **Commits are atomic:** one logical change per commit, together with its tests, stories, TSDoc, messages, and migration. Do not mix unrelated changes, and do not leave a commit that references code added by a later one.
- **Never bypass the hooks** (`--no-verify`). If one fails, fix the cause and commit again.
- Commit only when asked, never commit `.env*` files with real values, and branch before committing on the default branch.

## Scripts

`package.json` contract (create them with these names when scaffolding):

```
pnpm dev                 Development server
pnpm build / start       Production build and start
pnpm lint / format       ESLint / Prettier
pnpm typecheck           tsc --noEmit
pnpm test                Unit tests
pnpm test:integration    Integration tests
pnpm test:stories        Stories as tests
pnpm test:e2e            Playwright
pnpm test:coverage       Coverage with thresholds
pnpm storybook           Local Storybook · pnpm build-storybook for the static build
pnpm docs:build          Generate TypeDoc · pnpm docs:check validates without generating
pnpm db:generate         Generate a migration from the schema
pnpm db:migrate          Apply migrations
pnpm db:studio           Drizzle Studio
pnpm check               lint + typecheck + test + test:integration + test:stories + docs:check
```

Run `pnpm check` before calling something done. While iterating, run only the affected test.

## Services

**Turso + Drizzle.** Schema lives in `src/shared/infrastructure/db/schema`. Never edit a migration that has been applied: generate a new one. Local development runs against `file:local.db`. Use a transaction when a use case writes to more than one table.

**Resend.** Used only from the `ResendEmailSender` adapter (Mailpit replaces it locally, see `EMAIL_TRANSPORT`). Templates are React Email components, each with its story, rendered in the runner's locale. Send with an idempotency key so confirmations are never duplicated.

**Sentry.** Standard `@sentry/nextjs` setup: `instrumentation.ts` (with `onRequestError`), `instrumentation-client.ts`, `sentry.server.config.ts`, `app/global-error.tsx`, and `withSentryConfig` in `next.config.ts`. Domain and application report through the `ErrorReporter` port, never by importing Sentry. Expected domain errors (validation, a deadline that has passed) are not reported.

**Environment variables** (declared and validated in `src/shared/infrastructure/env.ts`; never read `process.env` anywhere else):

```
TURSO_DATABASE_URL   TURSO_AUTH_TOKEN
BETTER_AUTH_SECRET   BETTER_AUTH_URL
ADMIN_EMAILS
GOOGLE_CLIENT_ID     GOOGLE_CLIENT_SECRET
EMAIL_TRANSPORT      RESEND_API_KEY       EMAIL_FROM           MAILPIT_URL
RECEIPT_STORAGE      RECEIPT_LOCAL_DIR    RECEIPT_MAX_BYTES    BLOB_READ_WRITE_TOKEN
CRON_SECRET
NEXT_PUBLIC_SENTRY_DSN   SENTRY_AUTH_TOKEN   SENTRY_ORG   SENTRY_PROJECT
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY   TURNSTILE_SECRET_KEY
```

`EMAIL_TRANSPORT=memory` and `RECEIPT_STORAGE=memory` are for local development and E2E: they send no real email and keep receipts on the local disk. `EMAIL_TRANSPORT=mailpit` is for local development only: the `MailpitEmailSender` adapter delivers every email, rendered as Resend would send it, to the Mailpit inbox from `docker-compose.yml` (`docker compose up -d mailpit`, inbox at `http://localhost:8025`, `MAILPIT_URL` defaults to it). Never use it on Vercel. `CRON_SECRET` protects `/api/cron/race-reminders`, which stays closed without it; Vercel Cron (`vercel.json`) calls it daily and sends the secret as a bearer token. Database tooling reads its connection through `src/shared/infrastructure/database-env.ts`, so it can run without the app's other secrets.

Vercel Blob credentials are added when the private store is created and connected (connected projects authenticate with short-lived OIDC credentials and a store id; follow the current Blob docs for the exact variable names). Keep `.env.example` up to date. Never commit `.env*` files with real values.

### Environments

| Environment | Git branch | URL                                  | Database (Turso, `aws-us-east-1`) | Receipts (Vercel Blob, private) |
| ----------- | ---------- | ------------------------------------ | --------------------------------- | ------------------------------- |
| Production  | `main`     | `catarinotlon.online` (`www` → apex) | `catarinotlon-production`         | `catarinotlon-receipts`         |
| Staging     | `staging`  | `staging.catarinotlon.online`        | `catarinotlon-staging`            | `catarinotlon-receipts-staging` |
| Local       | any        | `http://localhost:3000`              | `file:local.db`                   | local disk                      |

- **Hosting:** the Vercel project `catarinotlon` (team Catarinotlon, region `iad1`, Node 24), connected to the GitHub repository. Vercel's Git integration deploys `main` to production and every other branch as a preview. Standard Deployment Protection keeps every preview, staging included, behind Vercel sign-in; only production domains are public.
- **Configuration lives in Vercel**, one value per environment (Production for `main`, Preview for the rest). Secrets are stored as sensitive variables and never pass through the chat, the repo, or logs. Production and staging never share a database, a Blob store, or an auth secret.
- **DNS** for `catarinotlon.online` is hosted by Vercel (the domain stays registered at GoDaddy). It holds the app's records, Resend's sending records (DKIM, the `send` and `rsend` subdomains), and a DMARC policy.
- **Email:** the app sends through Resend from `contact@catarinotlon.online`. Incoming mail to the domain is forwarded by ImprovMX to the organizer's inbox; do not add a receiving MX for Resend, or forwarding breaks.
- **Google sign-in:** one OAuth web client in the Google Cloud project `catarinotlon`, with origins and redirect URIs for production, staging, and localhost.
- **Migrations** are applied to each Turso database with `pnpm db:migrate`, pointing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` at it. Apply them to staging first.

## Personal data and security

Runner data is stored (name, email, phone). Never write it to logs, error messages, or Sentry events (Sentry 11 collects personal data by default, so `sentryOptions` turns off every `dataCollection` category and scrubs in `beforeSend`). Validate all input on the server even if the client already validated it. Never expose secrets through the `NEXT_PUBLIC_` prefix. Passwords, sessions, and OAuth tokens are handled only by Better Auth: never log them, store them yourself, or put them in URLs. A runner can only ever see or change their own registration and ticket.

**Analytics and session replay (PostHog) never see personal data.** Recordings mask every input. Any element that shows personal data (names, emails, phones, shirt names, bank data, the account and payment pages, every admin page) carries `data-private`, which masks its text; anything that must not be recorded at all (the ticket QR, which collects a kit; receipts; the scanner camera) carries the `ph-no-capture` class. Never call `posthog.identify` with an email or name. A new component that shows personal data adds the marker in the same change, with a story that asserts it. Changing what is tracked means updating the privacy notice and bumping its version.

## Brand and design

- Reference mocks (private canvas): https://claude.ai/artifact/VFeXaxC6F9AiJhPPhfquS3. Eight pages: landing, sign-up and sign-in, complete registration and payment, account (confirmed, pending payment, in review, receipt rejected), emails, admin, password and verification and error screens, and legal. Most screens come in light and dark, desktop and mobile; emails are light only; admin kit pickup is mobile only.
- The shirt photos in the mocks are retouched previews: the logo was redrawn to say "Catarinotlón". The medals in the mocks and the app are the organizer's artwork with the name corrected. Both are good enough for the website but are not production art for the manufacturer. Copy in the mocks is Spanish; bracketed text like `[FECHA DEL EVENTO]` marks facts that are still missing.
- Source art lives in `design/assets/`: `icons/` (the ladybug favicon and the app icons, which the PNGs and the `.ico` are rendered from), `shirt/` (front, back, and back without a name for the shirt-name preview) and `medals/` (`organizer-medals-source.png`, the organizer's original image with the misspelled name, plus the earlier SVG drawings, which the app no longer uses). Copy what the app needs into the app's static assets when scaffolding.
- Brand colors: ladybug red `#D42016`, black `#121212`, medal gold `#D8B25A`. They are exposed to components as semantic tokens.
- Light theme: white background, `#F2F2F3` muted background, `#121212` text, `#4A4A4E` muted text.
- Dark theme: `#0E0E0F` background, `#18181A` surface, `#232327` raised surface, `#34343A` border, `#F5F5F6` text, `#B9B9BF` muted text, `#FF5A4D` red for text.
- Red buttons, the dotted red panel, and the red registration section look the same in both themes.
- Typography: Barlow Condensed (headings, italic 800/900, uppercase) and Barlow (body), loaded with `next/font`.
- Motifs: black dots on red (medal ribbon), dotted route ending in a ladybug pin, speed lines from the logo.
- Accessibility: minimum 4.5:1 text contrast, 44 px touch targets, native controls (`button`, `a`, `input` + `label`), everything keyboard-navigable.
- Design mobile-first.

## Not decided yet (do not implement or assume)

- Going to production: when the production domain opens to the public, and CI checks beyond Vercel's Git deployments. **Sentry must be configured before launch.**
- Plans: Vercel and Resend stay on their free plans by decision. Mind the limits: Vercel Hobby runs cron jobs once a day within the scheduled hour, and Resend Free sends at most 100 emails a day (more are refused, not retried). The event expects at most 25 runners, so these limits are enough.
- Whether a runner can hand their place over to another person.
- How the podium is decided: whether the three places are overall per distance or split by category (gender, age group), and so how many podium medals there really are.
- What happens to a stored transfer receipt when its owner asks for erasure. The file shows personal and bank data and cannot be anonymized; it is kept for now, pending legal review.
- **Real event facts are intentionally not available yet:** date, venue, schedule, prices, shirt sizes, rules, the shirt-size change deadline, the minimum age, and the payment data (bank, CLABE, the administrator's name, phone, email, contact hours, and WhatsApp number). Nearly all of them are event settings that an admin will enter from the panel (see "Event settings"): never seed them with invented values, in code, migrations, tests fixtures shown as real, or demo data. The rules and the minimum age are not settings yet and stay undecided.
