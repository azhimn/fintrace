"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">fintrace can&apos;t load this page</h1>
      <p className="text-muted-foreground">Something went wrong loading this page. Try again in a moment.</p>
      <Button onClick={reset} className="h-11 self-start px-4">
        Try again
      </Button>
    </main>
  );
}
