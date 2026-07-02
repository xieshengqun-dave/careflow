"use client";

import { useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { quickCheckInByCode } from "@/lib/actions/queue";

export function QuickCheckIn() {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await quickCheckInByCode(v);
      if (result.error) {
        setFeedback({ ok: false, msg: result.error });
      } else {
        setFeedback({ ok: true, msg: `${result.patientName} — checked in` });
        setValue("");
        setTimeout(() => setFeedback(null), 4000);
        inputRef.current?.focus();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Appointment code (e.g. A3F9B2) or phone…"
          className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cf-primary-300 disabled:opacity-50"
          disabled={isPending}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="h-9 px-4 text-sm font-semibold bg-cf-primary-700 text-white rounded-lg hover:bg-cf-primary-800 disabled:opacity-40 transition-colors shrink-0"
      >
        {isPending ? "Checking…" : "Check In"}
      </button>
      {feedback && (
        <span
          className={`text-sm font-medium shrink-0 ${
            feedback.ok ? "text-cf-green-600" : "text-cf-red-600"
          }`}
        >
          {feedback.ok ? "✓ " : "✗ "}
          {feedback.msg}
        </span>
      )}
    </form>
  );
}
