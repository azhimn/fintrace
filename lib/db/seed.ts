import { eq } from "drizzle-orm";
import type { Db } from "./index";
import { accounts, categories, envelopes, settings, subcategories, users } from "./schema";

const ACCOUNTS = [
  { name: "Cash", kind: "cash", countsAsUsable: true },
  { name: "Mandiri", kind: "bank", countsAsUsable: true, minBalance: 37_000 },
  { name: "Jago", kind: "bank", countsAsUsable: true },
  { name: "Dana", kind: "e_wallet" },
  { name: "Gopay", kind: "e_wallet" },
  { name: "Shopee Pay", kind: "e_wallet" },
  { name: "e-Money", kind: "e_wallet" },
  { name: "External", kind: "external" },
] as const;

const ENVELOPES = [
  "Fuel", "Gifts", "Meal", "Motorcycle", "Wants", "Pet Care", "Personal Care", "Charity",
  "Electricity", "Internet", "Housing Rent", "Tuition", "Investment", "Unallocated",
];

type Kind = "income" | "expense" | "saving";
// [subcategory, default classification]; Income and Saving have no default in SPEC section 2b.
const TAXONOMY: { name: string; kind: Kind; subs: [string, ("needs" | "wants")?][] }[] = [
  {
    name: "Income",
    kind: "income",
    subs: [
      ["Salary"], ["Side Job / Freelance"], ["Family Support"], ["Refund & Cashback"],
      ["Interest & Returns"], ["Carry-over from last cycle"], ["Other Income"],
    ],
  },
  {
    name: "Food & Beverage",
    kind: "expense",
    subs: [["Meal", "needs"], ["Groceries", "needs"], ["Snack", "wants"], ["Drink", "wants"], ["Coffee", "wants"]],
  },
  {
    name: "Transportation",
    kind: "expense",
    subs: [
      ["Fuel", "needs"], ["Vehicle Maintenance & Service", "needs"], ["Parking & Toll", "needs"],
      ["Ride-hailing & Public Transport", "needs"],
    ],
  },
  {
    name: "Housing & Utilities",
    kind: "expense",
    subs: [
      ["Rent", "needs"], ["Electricity", "needs"], ["Water", "needs"],
      ["Internet & Mobile Data", "needs"], ["Household Supplies", "needs"],
    ],
  },
  {
    name: "Education",
    kind: "expense",
    subs: [
      ["Tuition", "needs"], ["Books & Literature", "wants"], ["Courses & Certification", "wants"],
      ["Printing & Documents", "needs"],
    ],
  },
  {
    name: "Health & Personal Care",
    kind: "expense",
    subs: [
      ["Healthcare & Medicine", "needs"], ["Skincare & Cosmetics", "wants"], ["Grooming", "needs"],
      ["Sport & Fitness", "wants"],
    ],
  },
  {
    name: "Shopping",
    kind: "expense",
    subs: [["Clothing & Fashion", "wants"], ["Electronics & Gadgets", "wants"], ["General Goods", "wants"]],
  },
  {
    name: "Entertainment & Subscriptions",
    kind: "expense",
    subs: [["Music & Streaming", "wants"], ["Movies & Events", "wants"], ["Games", "wants"], ["Hobbies", "wants"]],
  },
  {
    name: "Digital & IT",
    kind: "expense",
    subs: [["Domain & Hosting", "wants"], ["Software & Apps", "wants"], ["Cloud Services", "wants"]],
  },
  {
    name: "Fees & Admin",
    kind: "expense",
    subs: [["Bank Fees", "needs"], ["Transfer Fees", "needs"], ["Government & Admin Fees", "needs"], ["Taxes", "needs"]],
  },
  {
    name: "Giving",
    kind: "expense",
    subs: [["Charity & Donation", "wants"], ["Zakat & Infaq", "needs"], ["Gifts", "wants"]],
  },
  {
    name: "Pets",
    kind: "expense",
    subs: [["Pet Food", "needs"], ["Vet & Pet Healthcare", "needs"], ["Pet Supplies", "wants"]],
  },
  {
    name: "Saving",
    kind: "saving",
    subs: [
      ["Investment – Mutual Funds"], ["Investment – Stocks"], ["Investment – Gold"],
      ["Emergency Fund"], ["Goal Savings"],
    ],
  },
];

export const DEFAULT_SHORTCUTS = {
  openQuickRecord: "r",
  saveAndAddAnother: "mod+enter",
  close: "escape",
};

/**
 * Creates the user if needed, then seeds their reference lists once. The settings row marks a
 * seeded user, so re-running never resurrects anything renamed or archived later in Settings.
 */
export async function seedUser(db: Db, email: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    const userId =
      existing?.id ?? (await tx.insert(users).values({ email, passwordHash }).returning({ id: users.id }))[0].id;

    const [seeded] = await tx.select({ userId: settings.userId }).from(settings).where(eq(settings.userId, userId));
    if (seeded) return { userId, seeded: false };

    await tx.insert(accounts).values(ACCOUNTS.map((a, i) => ({ ...a, userId, sortOrder: i })));
    await tx.insert(envelopes).values(
      ENVELOPES.map((name, i) => ({ userId, name, sortOrder: i, isSystem: name === "Unallocated" })),
    );
    for (const [i, { name, kind, subs }] of TAXONOMY.entries()) {
      const [category] = await tx
        .insert(categories)
        .values({ userId, name, kind, sortOrder: i })
        .returning({ id: categories.id });
      await tx.insert(subcategories).values(
        subs.map(([sub, defaultClassification]) => ({ categoryId: category.id, name: sub, defaultClassification })),
      );
    }
    await tx.insert(settings).values({ userId, defaultPayDay: 25, shortcuts: DEFAULT_SHORTCUTS });
    return { userId, seeded: true };
  });
}
