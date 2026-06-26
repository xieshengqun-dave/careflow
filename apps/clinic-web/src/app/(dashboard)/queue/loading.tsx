export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-44 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-[18px]" />
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded-[18px]" />
    </div>
  );
}
