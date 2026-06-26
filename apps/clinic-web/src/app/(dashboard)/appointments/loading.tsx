export default function Loading() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-muted animate-pulse rounded-lg" />
          <div className="h-8 w-36 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
      {/* DateNav */}
      <div className="h-9 w-72 bg-muted animate-pulse rounded-lg" />
      {/* Table */}
      <div className="rounded-[18px] border overflow-hidden">
        <div className="h-12 bg-slate-50 animate-pulse" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 border-b last:border-0 animate-pulse" style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#fff" }} />
        ))}
      </div>
    </div>
  );
}
