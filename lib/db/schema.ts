import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const accountKind = pgEnum("account_kind", ["bank", "e_wallet", "cash", "external"]);
export const categoryKind = pgEnum("category_kind", ["income", "expense", "saving"]);
export const transactionType = pgEnum("transaction_type", ["income", "expense", "saving", "transfer"]);
export const classification = pgEnum("classification", ["needs", "wants"]);
export const frequency = pgEnum("frequency", ["once", "weekly", "semiweekly", "monthly", "quarterly"]);
export const cycleStatus = pgEnum("cycle_status", ["open", "closed"]);
export const wishlistTime = pgEnum("wishlist_time", ["Once", "Monthly", "Quarterly"]);

const rupiah = (name: string) => bigint(name, { mode: "number" });
const quantity = () => numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1");
// Fractions come from quantity; money is always whole rupiah (SPEC section 1).
const computedTotal = (expression: ReturnType<typeof sql>) =>
  rupiah("total").generatedAlwaysAs(expression);

// Auth.js tables. The adapter reads these property names; only the SQL names are ours.
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
});

// Named auth_accounts because `accounts` is the wallets table from SPEC section 2.
export const authAccounts = pgTable(
  "auth_accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

const userId = () => text("user_id").notNull().references(() => users.id, { onDelete: "cascade" });

// SPEC section 5 Settings: default pay day and per-user shortcuts.
export const settings = pgTable(
  "settings",
  {
    userId: userId().primaryKey(),
    defaultPayDay: smallint("default_pay_day").notNull().default(25),
    shortcuts: jsonb("shortcuts").$type<Record<string, string>>().notNull().default({}),
  },
  (t) => [check("settings_pay_day_range", sql`${t.defaultPayDay} between 1 and 31`)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    kind: accountKind("kind").notNull(),
    minBalance: rupiah("min_balance").notNull().default(0),
    countsAsUsable: boolean("counts_as_usable").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const envelopes = pgTable(
  "envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    // Index into the Budget pastels, fixed at creation so reordering never recolours a Budget.
    hue: smallint("hue").notNull().default(0),
  },
  (t) => [index("envelopes_user_idx").on(t.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    kind: categoryKind("kind").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("categories_user_idx").on(t.userId)],
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Null for Income and Saving: SPEC section 2b gives them no Needs/Wants default.
    defaultClassification: classification("default_classification"),
    defaultEnvelopeId: uuid("default_envelope_id").references(() => envelopes.id, { onDelete: "set null" }),
  },
  (t) => [index("subcategories_category_idx").on(t.categoryId)],
);

// The no-overlap exclusion constraint lives in a custom migration: Drizzle has no API for it.
export const cycles = pgTable(
  "cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: cycleStatus("status").notNull().default("open"),
  },
  (t) => [check("cycles_dates_ordered", sql`${t.endDate} >= ${t.startDate}`)],
);

export const planItems = pgTable(
  "plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id, { onDelete: "cascade" }),
    sortNo: integer("sort_no").notNull().default(0),
    item: text("item").notNull(),
    location: text("location"),
    sourceAccountId: uuid("source_account_id").notNull().references(() => accounts.id),
    sourceEnvelopeId: uuid("source_envelope_id").references(() => envelopes.id),
    destAccountId: uuid("dest_account_id").notNull().references(() => accounts.id),
    destEnvelopeId: uuid("dest_envelope_id").references(() => envelopes.id),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
    classification: classification("classification"),
    type: transactionType("type").notNull(),
    unit: text("unit"),
    frequency: frequency("frequency").notNull().default("once"),
    quantity: quantity(),
    amount: rupiah("amount").notNull(),
    discount: rupiah("discount").notNull().default(0),
    date: date("date"),
    total: computedTotal(sql`round(quantity * amount - discount)::bigint`),
  },
  (t) => [index("plan_items_cycle_idx").on(t.cycleId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Restrict, not cascade: full history must survive for Section 8 metrics.
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    date: date("date").notNull(),
    item: text("item").notNull(),
    location: text("location"),
    sourceAccountId: uuid("source_account_id").notNull().references(() => accounts.id),
    sourceEnvelopeId: uuid("source_envelope_id").references(() => envelopes.id),
    destAccountId: uuid("dest_account_id").notNull().references(() => accounts.id),
    destEnvelopeId: uuid("dest_envelope_id").references(() => envelopes.id),
    type: transactionType("type").notNull(),
    amount: rupiah("amount").notNull(),
    quantity: quantity(),
    discount: rupiah("discount").notNull().default(0),
    unit: text("unit"),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
    classification: classification("classification"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    note: text("note"),
    isOpening: boolean("is_opening").notNull().default(false),
    planItemId: uuid("plan_item_id").references(() => planItems.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    total: computedTotal(sql`round(quantity * amount - discount)::bigint`),
  },
  (t) => [
    index("transactions_cycle_date_idx").on(t.cycleId, t.date),
    index("transactions_item_trgm_idx").using("gin", t.item.op("gin_trgm_ops")),
  ],
);

export const reconciliations = pgTable(
  "reconciliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    countedBalance: rupiah("counted_balance").notNull(),
    countedAt: timestamp("counted_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
  },
  (t) => [index("reconciliations_cycle_idx").on(t.cycleId)],
);

export const borrows = pgTable(
  "borrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    lender: text("lender").notNull(),
    lendee: text("lendee").notNull(),
    item: text("item").notNull(),
    sourceAccountId: uuid("source_account_id").references(() => accounts.id),
    envelopeId: uuid("envelope_id").references(() => envelopes.id),
    // Signed: positive when lent out, negative when repaid or borrowed.
    amount: rupiah("amount").notNull(),
    date: date("date").notNull(),
    settled: boolean("settled").notNull().default(false),
  },
  (t) => [index("borrows_user_idx").on(t.userId)],
);

export const wishlist = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    item: text("item").notNull(),
    reason: text("reason"),
    price: rupiah("price").notNull(),
    category: text("category"),
    priority: integer("priority").notNull().default(0),
    relativePriority: integer("relative_priority").notNull().default(0),
    unit: text("unit"),
    time: wishlistTime("time").notNull().default("Once"),
    quantity: quantity(),
    discount: rupiah("discount").notNull().default(0),
    acquired: boolean("acquired").notNull().default(false),
    total: computedTotal(sql`round(price * quantity - discount)::bigint`),
  },
  (t) => [index("wishlist_user_idx").on(t.userId)],
);
