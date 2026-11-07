# fintrace

Personal envelope budgeting by pay cycle, across several wallets and bank accounts. It replaces a Google Sheet, and the main goal is that recording a transaction takes seconds. [docs/SPEC.md](docs/SPEC.md) is the source of truth and defines the milestones.

Milestones M1 to M3 exist today: the schema and migrations, seed data, login, the user-scoped data layer, the id-ID formatter and amount parser, `lib/finance.ts` with every SPEC section 4 formula, the Overview home screen, and Quick Record (as a sheet from any app page and at `/record`), installable as a PWA with an offline queue. The management and supporting screens come in M4 and M5.

## Local development

Everything runs in Docker, so the host only needs Docker with the Compose plugin. Don't run `pnpm install` on the host. Dependencies live in a named volume, and the source is bind-mounted into the container.

```sh
cp .env.example .env
```

In `.env`, set `AUTH_SECRET` (`openssl rand -base64 33`), `SEED_EMAIL` and `SEED_PASSWORD`. Then:

```sh
docker compose up -d --build          # starts Postgres and the dev server
docker compose exec app pnpm db:migrate
docker compose exec app pnpm db:seed
```

Open http://localhost:3000 and sign in with the seed email and password. `.env` sets `COMPOSE_FILE=docker-compose.dev.yml`, so plain `docker compose` commands use the dev stack. The first start takes a minute while `pnpm install` runs: follow it with `docker compose logs -f app`.

### Everyday commands

Run all of these inside the container:

| Task | Command |
|---|---|
| Lint | `docker compose exec app pnpm lint` |
| Type-check | `docker compose exec app pnpm typecheck` |
| Tests | `docker compose exec app pnpm test` |
| Add a dependency | `docker compose exec app pnpm add <package>` |
| Generate a migration after editing the schema | `docker compose exec app pnpm db:generate` |
| Apply migrations | `docker compose exec app pnpm db:migrate` |
| Seed | `docker compose exec app pnpm db:seed` |
| Open psql | `docker compose exec db psql -U fintrace` |
| Dev server logs | `docker compose logs -f app` |
| Stop, keeping data | `docker compose down` |
| Stop and delete the database and dependencies | `docker compose down -v` |

The seed creates your user and their reference lists once. Running it again changes nothing, even if you have renamed things since, and it won't reset a password. It creates the only login: there is no signup.

Tests don't need the Postgres container. `lib/db/db.test.ts` runs the real migrations on [PGlite](https://pglite.dev), an in-process build of Postgres.

Postgres has no port on the host. If port 3000 is taken, set `APP_PORT` in `.env`, and change the port in `APP_URL` to match.

The container runs as uid 1000 so that files it writes to the bind mount, such as new migrations, stay owned by you. If your host uid is different, change `user:` in `docker-compose.dev.yml`.

After you change `.env`, run `docker compose up -d app` to recreate the container with the new values.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. |
| `AUTH_SECRET` | yes | Auth.js signing secret. |
| `APP_URL` | yes | Public origin of the app, used for auth redirects. |
| `SEED_EMAIL`, `SEED_PASSWORD` | to seed | Login created by `pnpm db:seed`. The password needs 8 to 128 characters. |
| `SMTP_HOST` | no | Turns on magic-link sign-in. |
| `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | no | Mail settings for magic links. `SMTP_PORT` defaults to 587. |
| `COMPOSE_FILE`, `APP_PORT` | dev only | Which compose file to use, and the host port for the dev server. |

## Layout

| Path | Contents |
|---|---|
| `lib/db/schema.ts` | Drizzle schema for every SPEC section 2 table, plus auth and settings |
| `drizzle/` | Migrations. `0000` and `0002` are hand-written SQL |
| `lib/db/seed.ts` | Seed data and `seedUser` |
| `lib/dal.ts` | `scopedTo(db, userId)`, the user-scoped queries |
| `lib/session.ts` | `getDal()`, which binds those queries to the signed-in user |
| `lib/finance.ts` | SPEC section 4 formulas as pure functions over DAL rows, tested on a fixture cycle in `lib/finance.test.ts` |
| `lib/format.ts` | Money, quantity, percent and date formatters, and `parseAmount` |
| `lib/record.ts` | Quick Record's Zod schema: section 3 pairings, ownership of every referenced id, and the defaults it fills in |
| `app/(app)/actions.ts`, `app/api/suggest` | Save, edit, undo and start-cycle actions; item suggestions |
| `components/record/` | Quick Record form, item combobox, sheet, toasts and offline sync |
| `components/overview/` | Overview parts: the Record bar, Needs vs Wants donut, recent records |
| `lib/offline-queue.ts`, `public/sw.js`, `app/manifest.ts` | The PWA: entries saved offline, the service worker, the manifest with its Record shortcut |
| `auth.ts`, `proxy.ts` | Auth.js config and route protection |

Server components and actions should get data through `getDal()`. `plan_items`, `transactions` and `reconciliations` have no `user_id`, so their queries are scoped through the cycle they belong to.

## Decisions

- **Auth table name.** The Auth.js accounts table is `auth_accounts`, because SPEC section 2 uses `accounts` for wallets.
- **Credentials with database sessions.** Auth.js refuses this pairing when Credentials is the only provider, and it always stores `jwt.encode`'s result in the session cookie. So the magic-link provider stays registered even without SMTP (it refuses every request until `SMTP_HOST` is set), and `jwt.encode` creates a real row in `sessions`.
- **Session contents.** `lib/public-session.ts` limits what `/api/auth/session` returns. Without it, Auth.js sends the whole user row to the browser, password hash included.
- **Drizzle version.** Drizzle's docs now install the 1.0 release candidate, but `@auth/drizzle-adapter` doesn't type-check against it, so fintrace uses the stable `drizzle-orm` 0.45 and `drizzle-kit` 0.31.
- **Passwords.** scrypt from Node's standard library, at OWASP's N=2^17, r=8, p=1. No extra dependency.
- **Login throttle.** Ten failures for one email lock it for 15 minutes. The count lives in memory, so it resets on restart and assumes one app process.
- **`settings` table.** SPEC section 2 doesn't list one, but section 5 needs per-user pay day and shortcuts, and section 9 seeds them.
- **`categories.archived`.** Not in the section 2 column list, but the same row says categories can be archived.
- **Nullable classification.** `subcategories.default_classification` is null for Income and Saving, since section 2b gives them no Needs or Wants default.
- **Default envelopes.** `subcategories.default_envelope_id` is seeded empty because the spec gives no mapping. Set it in Settings once that screen exists (M5).
- **Whole-rupiah totals.** `total` is a generated column rounded to whole rupiah on `transactions`, `plan_items` and `wishlist`. Section 2 only says `round()` for transactions, but money is stored as BIGINT throughout.
- **Deferred cycle constraint.** `cycles_no_overlap` is checked at commit, so moving a pay day can update both neighbouring cycles in one transaction. It prevents overlaps only: gaps are the job of the cycle logic in M4.
- **Amount parsing.** In `parseAmount` a dot only ever groups thousands, so `1.5jt` is rejected rather than guessed at. `1,5jt` is the accepted form. Results that would land on a fraction of a rupiah are rejected too.
- **Time zone.** "Today" is fixed to Asia/Jakarta.
- **Goal Savings link.** The optional link from a Goal Savings row to a wishlist item (section 2b) has no column yet, because section 2's transaction columns don't include one. It can be added later without touching existing data.
- **Section 8 metrics.** Out of scope for now. The tables it needs are additive, and transactions can't be deleted along with their cycle, so history stays available.
- **Line totals in code.** `lineTotal` in `lib/finance.ts` computes `round(quantity * amount - discount)` in exact integers and rounds half away from zero, the same as Postgres. A test in `lib/db/db.test.ts` checks it against the generated `total` column. The formulas use it, so they don't depend on `total` having been read from the database.
- **Opening rows.** A row with `is_opening` adds its total to its destination account and envelope, whatever its type, and the running balance counts it as money in. Close-cycle (M4) should insert them as income from External.
- **Transfers within one envelope.** Section 4 counts every transfer into an envelope as allocated, but only counts transfers out when the destination envelope differs. Moving Meal money from Jago to Cash would then raise Meal's remaining. fintrace leaves such transfers out of both allocated and moved out.
- **Missing envelopes.** Envelope balances skip rows with no envelope. Section 3 says the write path fills in Unallocated, so it has to.
- **Percent used and variance.** `% used` is spent over allocated, and empty when nothing was allocated. Plan-vs-actual variance is planned minus actual, so a positive number is money not yet used.
- **Unclassified spending.** Saving subcategories have no Needs or Wants default, so Needs vs Wants gets a third group for rows with no classification.
- **Reconciliation.** The latest count per account is compared with the balance the caller passes in, normally the current one.
- **Borrows.** The person in a borrow row is whichever of lender and lendee is not the user, so `borrowBalances` takes the user's own name.
- **Item suggestions.** `/api/suggest` is a GET route rather than a Server Action, because it runs on every keystroke and Server Actions run one at a time. Past item names match with `ilike` or the pg_trgm `%` operator and rank by count × word similarity ÷ (1 + days since last use ÷ 14). With an empty field, Quick Record lists the top past items for one-tap repeats; plan items of the current cycle and unacquired wishlist items join once you type. A plan item wins a name clash, so the record links to it.
- **Write path.** `lib/dal.ts` checks every account, envelope, subcategory and plan item id against the user's own rows through `recordSchema` in `lib/record.ts`, which also validates the section 3 pairings. An empty Budget is stored as the subcategory's default envelope, or Unallocated, on both sides of the row.
- **Offline queue.** Quick Record makes each record's id in the browser. Entries saved offline wait in `localStorage` and are sent when the browser comes back online or the app next opens; the insert ignores an id it already has, so a resend is saved once. An entry the server refuses opens a toast with a Fix button that reopens it in the form. Edits need a connection.
- **Service worker.** `public/sw.js` registers in production builds only. It caches hashed build assets on first use, and the Overview and `/record` pages each time they load online, so the installed app opens offline. A navigation that lands on the login page clears the cached pages. Offline behaviour can't be tested in `next dev`.
- **Starting a cycle from Quick Record.** A record dated outside every cycle asks for a start date (the default pay date on or before it) and creates the cycle. The cycle before it is shortened or extended to end the day before, and the new one runs to the day before the next pay date at least 15 days later, so a pay day moved a few days early still ends at next month's. It refuses a start that would leave the cycle before with records on or after it. Closing a cycle with opening rows is M4.
- **Amount keypad.** The amount field uses `inputmode="numeric"`, as SPEC section 5 asks, and phone number pads have no letters, so rb and jt buttons sit under the field. Plain digits gain thousands dots as you type.
- **Shortcuts.** Read from `settings.shortcuts` over the defaults in `lib/shortcuts.ts`. Bindings look like `r`, `mod+enter` (Ctrl, or Cmd on a Mac) and `escape`. The editor comes with Settings in M5.
- **Undo.** The toast after saving a new record offers Undo, which deletes it, or takes it out of the offline queue. Saved edits have no Undo.
- **Budget colours.** Each envelope's pastel comes from its sort order, so reordering envelopes in Settings will recolour them. Unallocated is always kraft.
- **Needs vs Wants donut.** Drawn as a small SVG. Recharts arrives with the Analytics charts in M5.
- **Icons.** Phosphor (`@phosphor-icons/react`, fill weight) replaced lucide-react.
