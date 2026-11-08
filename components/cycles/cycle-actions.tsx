"use client";

import { LockSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { closeCycle, moveCycleStart, startFirstCycle } from "@/app/(app)/actions";
import { DateField } from "@/components/record/record-form";
import { useAction } from "@/components/shell/action";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { formatDate } from "@/lib/format";

const labelClass = "text-[0.8125rem] font-medium text-muted-foreground";

/** Moves an open cycle's pay day. The cycle before ends the day before the new date. */
export function StartDateEditor({ cycleId, start }: { cycleId: string; start: string }) {
  const [value, setValue] = useState(start);
  const { run, pending, alert } = useAction();
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        Pay day (cycle start)
      </label>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <DateField id={id} value={value} onChange={setValue} />
        </div>
        <Button
          size="lg"
          variant="secondary"
          disabled={pending || value === start}
          onClick={() => run(() => moveCycleStart(cycleId, value), `Pay day moved to ${formatDate(value)}`)}
          className="h-11 text-[0.9375rem]"
        >
          Move
        </Button>
      </div>
      {alert}
    </div>
  );
}

/**
 * Close cycle: asks for the next pay date, then locks this cycle and carries every Fund and Budget
 * balance into the next one. When the next cycle already exists, its start is the pay date.
 */
export function CloseCycle({ cycleId, name, suggested, fixed }: { cycleId: string; name: string; suggested: string; fixed: boolean }) {
  const [value, setValue] = useState(suggested);
  const [confirming, setConfirming] = useState(false);
  const { run, pending, alert } = useAction();
  const id = useId();
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-panel p-4">
      <p className="text-[0.9375rem]">
        Closing locks {name}: its records and plan can&apos;t change afterwards. Each Fund and Budget balance carries over as
        an opening row, and the plan is copied.
      </p>
      {confirming ? null : fixed ? (
        <p className="text-[0.9375rem]">The next cycle already starts on {formatDate(suggested)}.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className={labelClass}>
            Next pay date
          </label>
          <DateField id={id} value={value} onChange={setValue} />
        </div>
      )}
      {alert}
      {confirming ? (
        <div role="alert" className="flex flex-col gap-3 rounded-panel bg-secondary/45 p-4">
          <p className="text-[0.9375rem]">
            Close {name} for good? The next cycle starts on {value ? formatDate(value) : "the date you picked"}. You can&apos;t
            undo this.
          </p>
          <div className="flex flex-wrap gap-2">
            <Tip label="Close it">
              <Button
                size="lg"
                disabled={pending}
                onClick={() => run(() => closeCycle(cycleId, value), `Closed ${name}`)}
                className="size-12 px-0"
              >
                <LockSimpleIcon weight="fill" aria-hidden className="size-5" />
              </Button>
            </Tip>
            <Button size="lg" variant="ghost" disabled={pending} onClick={() => setConfirming(false)} className="text-[0.9375rem]">
              Keep it open
            </Button>
          </div>
        </div>
      ) : (
        <Button size="lg" variant="secondary" onClick={() => setConfirming(true)} className="self-start text-[0.9375rem]">
          Close cycle
        </Button>
      )}
    </div>
  );
}

export function StartFirstCycle({ suggested }: { suggested: string }) {
  const [value, setValue] = useState(suggested);
  const { run, pending, alert } = useAction();
  const id = useId();
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-panel p-4">
      <p className="text-[0.9375rem]">
        No pay cycle yet. Pick your last pay day to start the first one. Recording a payment starts one too.
      </p>
      <label htmlFor={id} className={labelClass}>
        Pay day
      </label>
      <DateField id={id} value={value} onChange={setValue} />
      {alert}
      <Tip label="Start cycle">
        <Button size="lg" disabled={pending} onClick={() => run(() => startFirstCycle(value), "Cycle started")} className="size-12 self-start px-0">
          <PlayIcon weight="fill" aria-hidden className="size-5" />
        </Button>
      </Tip>
    </div>
  );
}
