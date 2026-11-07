export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="bg-kraft px-5 pt-5 pb-5">
        <div className="mx-auto max-w-5xl">
          <div className="h-5 w-24" />
          <div className="mt-4 h-28 animate-pulse rounded-panel bg-window/70 lg:max-w-md" />
        </div>
      </div>
      <div className="flap" aria-hidden />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 pt-[22px]">
        <div className="h-15 rounded-button bg-primary/30 lg:hidden" />
        <div className="h-48 animate-pulse rounded-panel bg-panel" />
        <div className="h-40 animate-pulse rounded-panel bg-panel" />
      </div>
    </div>
  );
}
