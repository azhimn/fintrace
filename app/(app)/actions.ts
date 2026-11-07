"use server";

import { refresh } from "next/cache";
import { payDateOnOrBefore } from "@/lib/calendar";
import { fieldErrors } from "@/lib/record";
import { getDal } from "@/lib/session";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Record<string, string> }
  | { ok: false; needsCycle: { date: string; suggestedStart: string } };

type Outcome = Awaited<ReturnType<Awaited<ReturnType<typeof getDal>>["addTransaction"]>>;

async function explain(outcome: Outcome | { ok: false; missing: true }, input: unknown): Promise<SaveResult> {
  if (outcome.ok) {
    refresh();
    return { ok: true };
  }
  if ("error" in outcome) {
    const fields = fieldErrors(outcome.error);
    return { ok: false, error: Object.values(fields)[0] ?? "Check the highlighted fields", fields };
  }
  if ("closed" in outcome) return { ok: false, error: "That date is in a closed cycle. Pick a date in the open one." };
  if ("missing" in outcome) return { ok: false, error: "That record no longer exists." };
  const dal = await getDal();
  const date = String((input as { date: string }).date);
  const [settings, cycles] = await Promise.all([dal.settings(), dal.cycles()]);
  const payDay = settings?.defaultPayDay ?? 25;
  // Suggest the default pay date, but never on or before the start of the cycle before it.
  const before = cycles.find((c) => c.startDate < date);
  const pay = payDateOnOrBefore(date, payDay);
  return {
    ok: false,
    needsCycle: { date, suggestedStart: before && pay <= before.startDate ? date : pay },
  };
}

export async function saveRecord(input: unknown, mode: "add" | "edit" = "add"): Promise<SaveResult> {
  const dal = await getDal();
  return explain(mode === "edit" ? await dal.updateTransaction(input) : await dal.addTransaction(input), input);
}

/** Answers the cycle prompt: starts a cycle on `start`, then saves the entry that asked for it. */
export async function startCycleAndSave(start: string, input: unknown, mode: "add" | "edit" = "add"): Promise<SaveResult> {
  const dal = await getDal();
  const settings = await dal.settings();
  const error = await dal.startCycle(start, String((input as { date?: unknown })?.date ?? ""), settings?.defaultPayDay ?? 25);
  if (error) return { ok: false, error };
  return saveRecord(input, mode);
}

export async function undoRecord(id: string) {
  const dal = await getDal();
  if (typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)) await dal.deleteTransaction(id);
  refresh();
}
