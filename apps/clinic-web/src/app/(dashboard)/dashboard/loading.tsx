export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-52 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-[18px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-muted animate-pulse rounded-[18px]" />
        <div className="h-72 bg-muted animate-pulse rounded-[18px]" />
      </div>
    </div>
  );
}
