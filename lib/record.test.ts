import { describe, expect, it } from "vitest";
import { pairingError, recordSchema, type Refs } from "./record";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [cash, jago, external, meal, unallocated, coffee] = [1, 2, 3, 4, 5, 6].map(id);
const refs: Refs = {
  accounts: [
    { id: cash, kind: "cash" },
    { id: jago, kind: "bank" },
    { id: external, kind: "external" },
  ],
  envelopes: [
    { id: meal, isSystem: false },
    { id: unallocated, isSystem: true },
  ],
  subcategories: [{ id: coffee, defaultClassification: "wants", defaultEnvelopeId: meal }],
  planItems: [],
};
const base = { id: id(99), item: "Kopi", type: "expense", sourceAccountId: cash, destAccountId: external, amount: 18_000, date: "2026-11-07" };
const parse = (over: object) => recordSchema(refs).safeParse({ ...base, ...over });
const paths = (over: object) => {
  const r = parse(over);
  return r.success ? [] : r.error.issues.map((i) => i.path[0]);
};

describe("pairingError", () => {
  it("accepts the section 3 pairings", () => {
    expect(pairingError("income", "external", "bank")).toBeNull();
    expect(pairingError("expense", "cash", "external")).toBeNull();
    expect(pairingError("saving", "bank", "external")).toBeNull();
    expect(pairingError("transfer", "bank", "cash")).toBeNull();
  });
  it("rejects the rest", () => {
    expect(pairingError("income", "bank", "cash")).toMatch(/External/);
    expect(pairingError("expense", "external", "cash")).toMatch(/External/);
    expect(pairingError("saving", "bank", "bank")).toMatch(/saving/i);
    expect(pairingError("transfer", "bank", "external")).toMatch(/two of your Funds/);
  });
});

describe("recordSchema", () => {
  it("fills Unallocated when no Budget or subcategory is given", () => {
    const r = parse({});
    expect(r.success && [r.data.sourceEnvelopeId, r.data.destEnvelopeId, r.data.quantity, r.data.discount]).toEqual([
      unallocated,
      unallocated,
      "1",
      0,
    ]);
  });
  it("takes the subcategory's default Budget and classification", () => {
    const r = parse({ subcategoryId: coffee });
    expect(r.success && [r.data.sourceEnvelopeId, r.data.classification]).toEqual([meal, "wants"]);
  });
  it("rejects ids that aren't the user's", () => {
    expect(paths({ sourceAccountId: id(50) })).toContain("sourceAccountId");
    expect(paths({ sourceEnvelopeId: id(51) })).toContain("sourceEnvelopeId");
    expect(paths({ subcategoryId: id(52) })).toContain("subcategoryId");
    expect(paths({ planItemId: id(53) })).toContain("planItemId");
  });
  it("checks pairings on the server", () => {
    expect(paths({ type: "income" })).toContain("destAccountId");
    expect(paths({ type: "transfer", destAccountId: jago })).toEqual([]);
  });
  it("refuses a transfer that moves nothing", () => {
    expect(paths({ type: "transfer", destAccountId: cash })).toEqual(["destEnvelopeId"]);
    expect(paths({ type: "transfer", destAccountId: cash, destEnvelopeId: meal })).toEqual([]);
  });
  it("rejects bad amounts and a discount above the price", () => {
    expect(paths({ amount: 0 })).toContain("amount");
    expect(paths({ amount: 1.5 })).toContain("amount");
    expect(paths({ discount: 20_000 })).toContain("discount");
    expect(paths({ quantity: "1.2345" })).toContain("quantity");
  });
});
