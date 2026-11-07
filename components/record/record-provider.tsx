"use client";

import { Drawer } from "@base-ui/react/drawer";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { saveRecord } from "@/app/(app)/actions";
import { flush } from "@/lib/offline-queue";
import type { RecordInput } from "@/lib/record";
import type { RecordData } from "@/lib/record-data";
import { isTyping, matchesShortcut } from "@/lib/shortcuts";
import { RecordForm, type Mode } from "./record-form";
import { Toaster, toasts } from "./toast";

type Open = (options?: { initial?: Partial<RecordInput>; mode?: Mode }) => void;
const RecordContext = createContext<{ open: Open; data: RecordData } | null>(null);

export function useRecord() {
  const value = use(RecordContext);
  if (!value) throw new Error("useRecord needs a RecordProvider");
  return value;
}

/**
 * Quick Record as a sheet over any app page, the open-Record shortcut, and the sync that sends
 * entries saved offline once the connection is back.
 */
export function RecordProvider({ data, children }: { data: RecordData; children: React.ReactNode }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<{ key: number; initial?: Partial<RecordInput>; mode?: Mode } | null>(null);
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDivElement>(null);

  const openSheet = useCallback<Open>((options) => {
    setSheet({ key: Date.now(), ...options });
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open || isTyping(e.target) || !matchesShortcut(e, data.shortcuts.openQuickRecord)) return;
      e.preventDefault();
      openSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openSheet, data.shortcuts.openQuickRecord]);

  useEffect(() => {
    async function sync() {
      const sent = await flush(
        (entry) => saveRecord(entry),
        (entry, result) => {
          const reason = "error" in result ? result.error : "It needs a new pay cycle.";
          const id = toasts.add({
            title: `${entry.item} didn't sync`,
            description: reason,
            timeout: 0,
            actionProps: {
              children: "Fix",
              onClick() {
                toasts.close(id);
                openSheet({ initial: entry });
              },
            },
          });
        },
      );
      if (sent) toasts.add({ title: `Synced ${sent} offline ${sent === 1 ? "record" : "records"}`, timeout: 4000 });
    }
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [openSheet]);

  return (
    <Toaster>
      <RecordContext value={{ open: openSheet, data }}>
        {children}
        <Drawer.Root
          open={open}
          onOpenChange={(next, details) => {
            // A rebound close key replaces Escape; the form handles it.
            if (!next && details.reason === "escape-key" && data.shortcuts.close !== "escape") return;
            setOpen(next);
          }}
          onOpenChangeComplete={(isOpen) => !isOpen && setSheet(null)}
        >
          <Drawer.VirtualKeyboardProvider>
            <Drawer.Portal>
              <Drawer.Backdrop className="fixed inset-0 min-h-dvh bg-foreground opacity-[calc(0.35*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
              <Drawer.Viewport className="fixed inset-0 flex items-end justify-center lg:items-center">
                <Drawer.Popup
                  ref={popup}
                  initialFocus={() => popup.current?.querySelector<HTMLElement>("[data-record-item]") ?? true}
                  className="flex h-[calc(100dvh-max(env(safe-area-inset-top),0.75rem))] w-full flex-col overflow-hidden rounded-t-sheet bg-background outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none lg:h-[min(46rem,calc(100dvh-3rem))] lg:max-w-lg lg:rounded-sheet"
                >
                  {sheet && (
                    <RecordForm
                      key={sheet.key}
                      data={data}
                      initial={sheet.initial}
                      mode={sheet.mode}
                      onDone={() => {
                        setOpen(false);
                        router.refresh();
                      }}
                      onClose={() => setOpen(false)}
                      title={
                        <Drawer.Title className="text-base font-medium">
                          {sheet.mode === "edit" ? "Edit record" : "Record"}
                        </Drawer.Title>
                      }
                    />
                  )}
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.VirtualKeyboardProvider>
        </Drawer.Root>
      </RecordContext>
    </Toaster>
  );
}
