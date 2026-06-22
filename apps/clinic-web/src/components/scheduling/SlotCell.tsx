"use client";

import type { GeneratedSlot, SlotStatus } from "@careflow/shared";

interface SlotCellProps {
  slot: GeneratedSlot;
  isSelected: boolean;
  onSelect: () => void;
}

const statusStyles: Record<SlotStatus | "SELECTED", string> = {
  AVAILABLE: "bg-green-50 border-green-300 text-green-800 hover:bg-green-100 cursor-pointer",
  BOOKED:    "bg-red-50 border-red-300 text-red-700 cursor-not-allowed opacity-80",
  BREAK:     "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed",
  BLOCKED:   "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed",
  SELECTED:  "bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-400 cursor-pointer",
};

const statusLabel: Record<SlotStatus, string> = {
  AVAILABLE: "Available",
  BOOKED:    "Booked",
  BREAK:     "Break",
  BLOCKED:   "Blocked",
};

export function SlotCell({ slot, isSelected, onSelect }: SlotCellProps) {
  const styleKey = isSelected ? "SELECTED" : slot.status;
  const isClickable = slot.status === "AVAILABLE";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onSelect : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onSelect() : undefined}
      className={`rounded border text-center py-2 px-1 text-xs font-medium transition-colors select-none ${statusStyles[styleKey]}`}
    >
      <div>{slot.start}</div>
      <div className="text-[10px] mt-0.5 font-normal opacity-80">
        {isSelected ? "Selected" : statusLabel[slot.status]}
      </div>
    </div>
  );
}
