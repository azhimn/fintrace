"use client";

import { Tooltip } from "@base-ui/react/tooltip";

/**
 * Names an icon-only control: `label` becomes its accessible name and a tooltip on hover or
 * keyboard focus. `children` is the control element itself; Tip renders it as the trigger.
 */
export function Tip({ label, children }: { label: string; children: React.ReactElement<Record<string, unknown>> }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={300} render={children} aria-label={label} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-50">
          <Tooltip.Popup className="origin-(--transform-origin) rounded-field bg-foreground px-2.5 py-1 text-[0.8125rem] font-medium text-window transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
