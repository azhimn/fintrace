const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 1000;

// shortcut: in-memory, so it resets on restart and covers one process, upgrade if the app ever runs more than one instance.
const failures = new Map<string, { count: number; resetAt: number }>();

export function isLocked(email: string, now = Date.now()) {
  const entry = failures.get(email);
  if (entry && entry.resetAt <= now) failures.delete(email);
  return !!entry && entry.resetAt > now && entry.count >= MAX_FAILURES;
}

export function recordFailure(email: string, now = Date.now()) {
  if (failures.size >= MAX_TRACKED) failures.clear();
  const entry = failures.get(email);
  if (entry && entry.resetAt > now) entry.count += 1;
  else failures.set(email, { count: 1, resetAt: now + WINDOW_MS });
}

export function clearFailures(email: string) {
  failures.delete(email);
}
