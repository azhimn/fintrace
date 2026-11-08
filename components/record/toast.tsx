"use client";

import { Toast } from "@base-ui/react/toast";

/** One manager for the app, so Quick Record and the offline sync share the same toasts. */
export const toasts = Toast.createToastManager();

function ToastList() {
  const { toasts: list } = Toast.useToastManager();
  return list.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="absolute right-0 bottom-0 left-0 z-[calc(100-var(--toast-index))] origin-bottom rounded-panel bg-foreground text-background [transform:translateY(calc(var(--toast-swipe-movement-y)-var(--toast-index)*0.5rem))_scale(calc(1-var(--toast-index)*0.04))] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:[transform:translateY(120%)] data-ending-style:[transform:translateY(120%)]"
    >
      <Toast.Content className="flex min-h-14 items-center gap-3 py-2 pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <Toast.Title className="truncate text-[0.9375rem]" />
          <Toast.Description className="text-sm text-background/75" />
        </div>
        <Toast.Action className="h-11 shrink-0 rounded-button bg-kraft px-4 text-[0.9375rem] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kraft" />
      </Toast.Content>
    </Toast.Root>
  ));
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toasts} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-md lg:right-8 lg:bottom-[6.5rem] lg:left-auto lg:w-96">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
