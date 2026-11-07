// Quick Record entries saved while offline, kept in localStorage until the server takes them.
import type { RecordInput } from "./record";

const KEY = "fintrace.offline-queue";

export function queued(): RecordInput[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

const write = (entries: RecordInput[]) => localStorage.setItem(KEY, JSON.stringify(entries));

export const enqueue = (entry: RecordInput) => write([...queued().filter((e) => e.id !== entry.id), entry]);
export const dequeue = (id: string) => write(queued().filter((e) => e.id !== id));

let flushing = false;

/**
 * Sends queued entries oldest first. An entry leaves the queue once the server answers, either way;
 * one the server refuses goes to `refused` so the user can fix it. A network failure stops the run
 * and keeps the rest for the next one. Entries carry their own id, so a resend is saved once.
 */
export async function flush<R extends { ok: boolean }>(
  send: (entry: RecordInput) => Promise<R>,
  refused: (entry: RecordInput, result: R) => void,
) {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const entry of queued()) {
      let result: R;
      try {
        result = await send(entry);
      } catch {
        break;
      }
      dequeue(entry.id);
      if (result.ok) sent++;
      else refused(entry, result);
    }
  } finally {
    flushing = false;
  }
  return sent;
}
