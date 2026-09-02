export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-muted animate-pulse rounded" />
          <div className="h-4 w-56 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
      </div>
      {/* Search */}
      <div className="h-9 w-80 bg-muted animate-pulse rounded-lg" />
      {/* Table + detail panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 rounded-[18px] border overflow-hidden">
          <div className="h-10 bg-slate-50 animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-12 border-b last:border-0 animate-pulse"
              style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#fff" }}
            />
          ))}
        </div>
        <div className="w-80 h-48 bg-muted animate-pulse rounded-[18px]" />
      </div>
    </div>
  );
}
