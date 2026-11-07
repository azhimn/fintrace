// SPEC section 3 input rules, shared by Quick Record in the browser and the write path on the server.
import { z } from "zod";
import { lineTotal } from "./finance";

export const TYPES = ["expense", "income", "transfer", "saving"] as const;
export type RecordType = (typeof TYPES)[number];
export const TYPE_LABELS: Record<RecordType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  saving: "Saving",
};
type Kind = "bank" | "e_wallet" | "cash" | "external";

const optionalId = z.uuid().nullish();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => s || null);

/** One transaction as Quick Record sends it. Only item, type, source, destination and amount are required. */
export const recordInput = z
  .object({
    // Made in the browser, so an offline entry synced twice is saved once.
    id: z.uuid(),
    item: z.string().trim().min(1, "Name the item").max(200),
    type: z.enum(TYPES),
    sourceAccountId: z.uuid("Pick a Fund"),
    destAccountId: z.uuid("Pick a Fund"),
    amount: z.number().int().positive("Enter an amount above zero").max(Number.MAX_SAFE_INTEGER),
    date: z.iso.date(),
    quantity: z
      .string()
      .regex(/^\d{1,7}(\.\d{1,3})?$/, "Use a number with up to 3 decimals")
      .refine((q) => Number(q) > 0, "Quantity must be above zero")
      .default("1"),
    discount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    sourceEnvelopeId: optionalId,
    destEnvelopeId: optionalId,
    subcategoryId: optionalId,
    planItemId: optionalId,
    classification: z.enum(["needs", "wants"]).nullish(),
    location: optionalText(200),
    unit: optionalText(40),
    note: optionalText(1000),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .refine((r) => lineTotal(r) >= 0, { message: "The discount is larger than the price", path: ["discount"] });

export type RecordInput = z.input<typeof recordInput>;

const own = (kind: Kind) => kind !== "external";

/** Section 3 source and destination pairings. Returns what is wrong, or null. */
export function pairingError(type: RecordType, source: Kind, dest: Kind) {
  if (type === "income") return !own(source) && own(dest) ? null : "Income comes from External into one of your Funds";
  if (type === "transfer") return own(source) && own(dest) ? null : "A transfer moves money between two of your Funds";
  const name = type === "saving" ? "A saving" : "An expense";
  return own(source) && !own(dest) ? null : `${name} goes from one of your Funds to External`;
}

/** The signed-in user's own rows that a transaction may point at. */
export type Refs = {
  accounts: { id: string; kind: Kind }[];
  envelopes: { id: string; isSystem: boolean }[];
  subcategories: { id: string; defaultClassification: "needs" | "wants" | null; defaultEnvelopeId: string | null }[];
  planItems: { id: string }[];
};

/**
 * recordInput checked against the user's own rows, with the defaults section 3 asks for filled in:
 * an empty Budget becomes the subcategory's default or Unallocated, an empty classification the
 * subcategory's default. Foreign keys alone would accept another user's ids, so every id must be in refs.
 */
export function recordSchema(refs: Refs) {
  const accounts = new Map(refs.accounts.map((a) => [a.id, a]));
  const envelopes = new Set(refs.envelopes.map((e) => e.id));
  const subcategories = new Map(refs.subcategories.map((s) => [s.id, s]));
  const planItems = new Set(refs.planItems.map((p) => p.id));
  const unallocated = refs.envelopes.find((e) => e.isSystem)?.id ?? null;

  return recordInput
    .superRefine((r, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
      const source = accounts.get(r.sourceAccountId);
      const dest = accounts.get(r.destAccountId);
      if (!source) issue("sourceAccountId", "Pick one of your Funds");
      if (!dest) issue("destAccountId", "Pick one of your Funds");
      for (const key of ["sourceEnvelopeId", "destEnvelopeId"] as const) {
        if (r[key] && !envelopes.has(r[key])) issue(key, "Pick one of your Budgets");
      }
      if (r.subcategoryId && !subcategories.has(r.subcategoryId)) issue("subcategoryId", "Pick one of your categories");
      if (r.planItemId && !planItems.has(r.planItemId)) issue("planItemId", "That plan item isn't yours");
      if (!unallocated) issue("sourceEnvelopeId", "The Unallocated Budget is missing");
      if (source && dest) {
        const error = pairingError(r.type, source.kind, dest.kind);
        if (error) issue(r.type === "income" ? "destAccountId" : "sourceAccountId", error);
      }
    })
    .transform((r) => {
      const sub = r.subcategoryId ? subcategories.get(r.subcategoryId) : undefined;
      const fallback = sub?.defaultEnvelopeId ?? unallocated!;
      return {
        ...r,
        sourceEnvelopeId: r.sourceEnvelopeId ?? fallback,
        destEnvelopeId: r.destEnvelopeId ?? fallback,
        classification: r.classification ?? sub?.defaultClassification ?? null,
      };
    })
    .refine(
      (r) => r.type !== "transfer" || r.sourceAccountId !== r.destAccountId || r.sourceEnvelopeId !== r.destEnvelopeId,
      { message: "Move money to another Fund or another Budget", path: ["destEnvelopeId"] },
    );
}

/** First message per field, for showing beside each control. */
export function fieldErrors(error: z.ZodError | undefined) {
  const out: Record<string, string> = {};
  for (const issue of error?.issues ?? []) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

/** Fields a picked suggestion fills in. Date and note stay as the user left them. */
export type Fill = Partial<Omit<RecordInput, "id" | "date" | "note">>;
export type Suggestion = { key: string; item: string; from: "history" | "plan" | "wishlist"; fill: Fill };

/** A stored transaction or plan item back in the shape Quick Record edits. */
export function rowToInput(t: {
  id: string;
  item: string;
  type: RecordType;
  sourceAccountId: string;
  destAccountId: string;
  amount: number;
  date: string | null;
  quantity: string;
  discount: number;
  sourceEnvelopeId: string | null;
  destEnvelopeId: string | null;
  subcategoryId: string | null;
  classification: "needs" | "wants" | null;
  location: string | null;
  unit: string | null;
  note?: string | null;
  tags?: string[];
  planItemId?: string | null;
}) {
  return {
    id: t.id,
    item: t.item,
    type: t.type,
    sourceAccountId: t.sourceAccountId,
    destAccountId: t.destAccountId,
    amount: t.amount,
    date: t.date,
    quantity: t.quantity,
    discount: t.discount,
    sourceEnvelopeId: t.sourceEnvelopeId,
    destEnvelopeId: t.destEnvelopeId,
    subcategoryId: t.subcategoryId,
    classification: t.classification,
    location: t.location,
    unit: t.unit,
    note: t.note ?? null,
    tags: t.tags ?? [],
    planItemId: t.planItemId ?? null,
  };
}
