"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Suggestion } from "@/lib/record";

const FROM = { history: null, plan: "Plan", wishlist: "Wishlist" } as const;

export function suggestionHint(s: Suggestion) {
  return [s.fill.amount != null ? formatMoney(s.fill.amount) : null, FROM[s.from]].filter(Boolean).join(" · ");
}

/** Past items for the empty field: the user's most frequent and recent, so a repeat is one tap. */
export function useSuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (q: string) => {
    controller.current?.abort();
    const current = (controller.current = new AbortController());
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: current.signal });
      if (res.ok && res.headers.get("content-type")?.includes("json")) setItems(await res.json());
    } catch {
      // Offline or superseded: keep what is showing.
    }
  }, []);
  return { items, load };
}

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (suggestion: Suggestion) => void;
  inputRef: React.Ref<HTMLInputElement>;
  invalid?: boolean;
  describedBy?: string;
};

export function ItemCombobox({ id, value, onChange, onPick, inputRef, invalid, describedBy }: Props) {
  const { items, load } = useSuggestions();
  const typed = value.trim() !== "";

  useEffect(() => {
    if (typed) load(value);
    // Only re-query when the text changes; load is stable.
  }, [value, typed, load]);

  return (
    <Autocomplete.Root
      items={typed ? items : []}
      value={value}
      filter={null}
      autoHighlight
      itemToStringValue={(s: Suggestion) => s.item}
      onValueChange={(next, details) => {
        const picked = details.reason === "item-press" ? items.find((s) => s.item === next) : undefined;
        if (picked) onPick(picked);
        else onChange(next);
      }}
    >
      <Autocomplete.Input
        id={id}
        ref={inputRef}
        data-record-item
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="next"
        placeholder="What did you pay for?"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-14 w-full rounded-field bg-field px-4 text-lg outline-none placeholder:text-muted-foreground focus-visible:shadow-[0_0_0_2px_var(--primary)] aria-invalid:shadow-[0_0_0_2px_var(--destructive)]"
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={6} align="start" className="z-[60] w-(--anchor-width)">
          <Autocomplete.Popup className="max-h-[min(var(--available-height),20rem)] overflow-y-auto overscroll-contain rounded-panel bg-panel p-1 shadow-[0_8px_24px_-8px_rgb(61_56_50/0.3)] data-empty:hidden">
            <Autocomplete.List>
              {(s: Suggestion) => (
                <Autocomplete.Item
                  key={s.key}
                  value={s}
                  className="flex min-h-12 cursor-default items-center justify-between gap-3 rounded-field px-3 py-2 select-none data-highlighted:bg-field"
                >
                  <span className="min-w-0 truncate">{s.item}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{suggestionHint(s)}</span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
