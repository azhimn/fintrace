"use server";

import { refresh } from "next/cache";
import type { ZodError } from "zod";
import { payDateOnOrBefore } from "@/lib/calendar";
import { fieldErrors } from "@/lib/record";
import { getDal } from "@/lib/session";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Record<string, string> }
  | { ok: false; needsCycle: { date: string; suggestedStart: string } };

type Outcome =
  | { ok: true }
  | { ok: false; error: ZodError }
  | { ok: false; closed: true }
  | { ok: false; missing: true }
  | { ok: false; needsCycle: true };

async function explain(outcome: Outcome, input: unknown): Promise<SaveResult> {
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

/** Deletes a record (also Undo for a new one). False when it was gone already or its cycle is closed. */
export async function deleteRecord(id: string) {
  const dal = await getDal();
  const removed = await dal.deleteTransaction(id);
  refresh();
  return removed;
}

export async function savePlanItem(cycleId: string, input: unknown, mode: "add" | "edit" = "add"): Promise<SaveResult> {
  const dal = await getDal();
  const outcome = await dal.savePlanItem(cycleId, input, mode);
  if (!outcome.ok && "closed" in outcome) return { ok: false, error: "This cycle is closed, so its plan is fixed." };
  if (!outcome.ok && "missing" in outcome) return { ok: false, error: "That plan item no longer exists." };
  return explain(outcome, input);
}

/** Removes a plan item and returns what Undo needs to put it back in the same place. */
export async function deletePlanItem(id: string) {
  const dal = await getDal();
  const row = await dal.deletePlanItem(id);
  refresh();
  return row && { cycleId: row.cycleId, sortNo: row.sortNo };
}

export async function copyPreviousPlan(cycleId: string) {
  const error = await (await getDal()).copyPreviousPlan(cycleId);
  refresh();
  return error;
}

export async function moveCycleStart(cycleId: string, start: string) {
  const error = await (await getDal()).moveCycleStart(cycleId, start);
  refresh();
  return error;
}

export async function closeCycle(cycleId: string, nextStart: string) {
  const dal = await getDal();
  const settings = await dal.settings();
  const { error } = await dal.closeCycle(cycleId, nextStart, settings?.defaultPayDay ?? 25);
  refresh();
  return error;
}

/** The first cycle, for a user who has none yet. */
export async function startFirstCycle(start: string) {
  const dal = await getDal();
  const settings = await dal.settings();
  const error = await dal.startCycle(start, start, settings?.defaultPayDay ?? 25);
  refresh();
  return error;
}

/** Refreshes after a write that worked, and passes its error message (or null) back. */
async function settle<T extends string | boolean | null>(write: Promise<T>) {
  const result = await write;
  if (result === null || result === true) refresh();
  return result;
}

export const addCount = async (cycleId: string, input: unknown) => settle((await getDal()).addCount(cycleId, input));
export const deleteCount = async (id: string) => settle((await getDal()).deleteCount(id));

export const addBorrow = async (input: unknown) => settle((await getDal()).addBorrow(input));
export const settleBorrows = async (person: string) => settle((await getDal()).settleBorrows(person));
export const deleteBorrow = async (id: string) => settle((await getDal()).deleteBorrow(id));

export const saveWish = async (input: unknown) => settle((await getDal()).saveWish(input));
export const setAcquired = async (id: string, acquired: boolean) => settle((await getDal()).setAcquired(id, acquired));
export const deleteWish = async (id: string) => settle((await getDal()).deleteWish(id));

export const saveAccount = async (id: string | null, patch: unknown) => settle((await getDal()).saveAccount(id, patch));
export const saveEnvelope = async (id: string | null, input: unknown) => settle((await getDal()).saveEnvelope(id, input));
export const deleteEnvelope = async (id: string) => settle((await getDal()).deleteEnvelope(id));
export const saveCategory = async (id: string | null, patch: unknown) => settle((await getDal()).saveCategory(id, patch));
export const saveSubcategory = async (id: string | null, categoryId: string, patch: unknown) =>
  settle((await getDal()).saveSubcategory(id, categoryId, patch));
export const reorder = async (list: "accounts" | "envelopes" | "categories", ids: string[]) =>
  settle((await getDal()).reorder(list, ids));
export const setPayDay = async (day: number) => settle((await getDal()).setPayDay(day));
export const setShortcuts = async (input: unknown) => settle((await getDal()).setShortcuts(input));
