"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">fintrace can&apos;t load this page</h1>
      <p className="text-muted-foreground">Something went wrong loading this page. Try again in a moment.</p>
      <Tip label="Try again">
        <Button onClick={reset} className="size-11 self-start px-0">
          <ArrowClockwiseIcon weight="fill" aria-hidden className="size-5" />
        </Button>
      </Tip>
    </main>
  );
}
