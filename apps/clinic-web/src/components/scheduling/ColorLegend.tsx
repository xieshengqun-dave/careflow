const items = [
  { color: "bg-green-400", label: "Available" },
  { color: "bg-red-400",   label: "Booked" },
  { color: "bg-gray-300",  label: "Break" },
  { color: "bg-blue-400",  label: "Selected" },
];

export function ColorLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map(({ color, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-full inline-block ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
