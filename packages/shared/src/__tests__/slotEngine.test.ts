import { describe, it, expect } from "vitest";
import { generateSlots } from "../utils/slotEngine";

describe("generateSlots", () => {
  const baseInput = {
    workingPeriods: [{ start: "09:00", end: "12:00" }],
    breaks: [],
    slotDuration: 30,
    bookedSlots: [],
  };

  it("generates correct number of slots", () => {
    const slots = generateSlots(baseInput);
    expect(slots).toHaveLength(6);
  });

  it("all slots are AVAILABLE when nothing is booked", () => {
    const slots = generateSlots(baseInput);
    expect(slots.every((s) => s.status === "AVAILABLE")).toBe(true);
  });

  it("marks BOOKED slots correctly", () => {
    const slots = generateSlots({
      ...baseInput,
      bookedSlots: [{ startTime: "09:00", appointmentId: "appt-1" }],
    });
    expect(slots[0].status).toBe("BOOKED");
    expect(slots[0].appointmentId).toBe("appt-1");
    expect(slots[1].status).toBe("AVAILABLE");
  });

  it("marks BREAK slots correctly", () => {
    const slots = generateSlots({
      ...baseInput,
      workingPeriods: [{ start: "09:00", end: "13:00" }],
      breaks: [{ start: "12:00", end: "13:00" }],
    });
    const breakSlots = slots.filter((s) => s.status === "BREAK");
    expect(breakSlots).toHaveLength(2);
    expect(breakSlots[0].start).toBe("12:00");
  });

  it("BREAK takes priority over BOOKED", () => {
    const slots = generateSlots({
      ...baseInput,
      breaks: [{ start: "09:00", end: "09:30" }],
      bookedSlots: [{ startTime: "09:00" }],
    });
    expect(slots[0].status).toBe("BREAK");
  });

  it("handles multiple working periods (morning + afternoon)", () => {
    const slots = generateSlots({
      workingPeriods: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "17:00" },
      ],
      breaks: [],
      slotDuration: 60,
      bookedSlots: [],
    });
    expect(slots).toHaveLength(6);
    expect(slots[3].start).toBe("14:00");
  });

  it("handles BLOCKED slots", () => {
    const slots = generateSlots({
      ...baseInput,
      blockedSlots: ["10:00"],
    });
    const blocked = slots.find((s) => s.start === "10:00");
    expect(blocked?.status).toBe("BLOCKED");
  });

  it("startMinutes and endMinutes are correct", () => {
    const slots = generateSlots(baseInput);
    expect(slots[0].startMinutes).toBe(540);
    expect(slots[0].endMinutes).toBe(570);
  });

  it("does not generate a slot that would exceed working period end", () => {
    const slots = generateSlots({
      ...baseInput,
      workingPeriods: [{ start: "09:00", end: "09:45" }],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBe("09:00");
  });

  it("returns empty array when no working periods", () => {
    const slots = generateSlots({ ...baseInput, workingPeriods: [] });
    expect(slots).toHaveLength(0);
  });

  it("partial overlap with break marks slot as BREAK", () => {
    const slots = generateSlots({
      ...baseInput,
      breaks: [{ start: "09:15", end: "09:45" }],
    });
    expect(slots[0].status).toBe("BREAK");
  });
});
