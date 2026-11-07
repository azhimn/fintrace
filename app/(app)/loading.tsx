export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-10">
      <div className="h-16 max-w-md animate-pulse bg-muted" />
      <div className="h-64 animate-pulse bg-muted" />
    </div>
  );
}
