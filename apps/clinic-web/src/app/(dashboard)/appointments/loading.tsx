export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-12 w-full bg-muted animate-pulse rounded" />
      <div className="h-96 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}
