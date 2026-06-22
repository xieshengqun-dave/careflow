"use client";

import { useRouter } from "next/navigation";

interface DateNavProps {
  selectedDate: string; // "YYYY-MM-DD"
}

function getMondayOf(dateStr: string): Date {
  const parts = dateStr.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dow = date.getDay(); // 0=Sun
  const diff = (dow + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DateNav({ selectedDate }: DateNavProps) {
  const router = useRouter();
  const monday = getMondayOf(selectedDate);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  function navigate(dateStr: string) {
    router.push(`/appointments?date=${dateStr}`);
  }

  function prevWeek() {
    const prev = new Date(monday);
    prev.setDate(monday.getDate() - 7);
    navigate(toDateStr(prev));
  }

  function nextWeek() {
    const next = new Date(monday);
    next.setDate(monday.getDate() + 7);
    navigate(toDateStr(next));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prevWeek}
        className="px-2 py-1.5 rounded hover:bg-muted text-muted-foreground text-sm font-medium transition-colors"
        aria-label="Previous week"
      >
        &#8249;
      </button>

      <div className="flex gap-1">
        {days.map((day, i) => {
          const str = toDateStr(day);
          const isSelected = str === selectedDate;
          return (
            <button
              key={str}
              onClick={() => navigate(str)}
              className={`flex flex-col items-center px-3 py-1.5 rounded text-xs font-medium transition-colors min-w-[48px] ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <span>{DAY_NAMES[i]}</span>
              <span className="text-sm font-semibold">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={nextWeek}
        className="px-2 py-1.5 rounded hover:bg-muted text-muted-foreground text-sm font-medium transition-colors"
        aria-label="Next week"
      >
        &#8250;
      </button>
    </div>
  );
}
