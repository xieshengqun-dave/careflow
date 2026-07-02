// Pure queue computation functions — no DB calls, no side effects.
// Replace rankQueueEntries with an ML model call to enable AI optimisation.

export type ArrivalStatus = "EARLY" | "ON_TIME" | "LATE" | "NO_SHOW";

/** Default consultation durations by treatment type (minutes). */
export const DEFAULT_TREATMENT_DURATIONS: Record<string, number> = {
  Checkup: 30,
  Cleaning: 45,
  Filling: 60,
  Extraction: 45,
  "Root Canal": 90,
  Crown: 60,
  Emergency: 20,
  Other: 30,
};

export const FALLBACK_DURATION_MINUTES = 30;

/** Per-doctor duration profile, derived from doctor_treatment_stats. */
export interface DoctorDurationProfile {
  /** Used when no treatment-type-specific data is available. */
  defaultMinutes: number;
  /** Historical average minutes per treatment type for this doctor. */
  byTreatmentType: Record<string, number>;
}

/** Minimal queue entry representation used by the engine. */
export interface QueueEntryInput {
  id: string;
  priority: number;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "REMOVED";
  calledAt: Date | null;
  estimatedDurationMinutes: number | null;
  treatmentType: string | null;
}

export interface QueuePositionEstimate {
  entryId: string;
  positionFromNow: number;        // 1 = next to be called
  estimatedStartTime: Date;
  estimatedEndTime: Date;
  estimatedWaitMinutes: number;   // minutes from now until this patient starts
}

/**
 * AI hook: ranks WAITING entries to determine call order.
 * Current implementation is rule-based (priority → FIFO).
 * Replace body with an ML model call to enable intelligent ordering.
 */
export function rankQueueEntries(entries: QueueEntryInput[]): QueueEntryInput[] {
  return [...entries].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.queueNumber - b.queueNumber,
  );
}

/**
 * Returns estimated consultation duration (minutes) for a treatment type.
 * Priority: doctor history → clinic/global templates → hardcoded defaults → doctor fallback.
 * Pass templateDurations (from treatment_templates table) to enable clinic-configured durations.
 * AI predictions will slot in here once the model is available (between history and templates).
 */
export function getEstimatedDuration(
  treatmentType: string | null | undefined,
  profile: DoctorDurationProfile,
  templateDurations?: Record<string, number>,
): number {
  if (treatmentType != null) {
    if (profile.byTreatmentType[treatmentType] != null) {
      return Math.round(profile.byTreatmentType[treatmentType]);
    }
    if (templateDurations?.[treatmentType] != null) {
      return templateDurations[treatmentType];
    }
    if (DEFAULT_TREATMENT_DURATIONS[treatmentType] != null) {
      return DEFAULT_TREATMENT_DURATIONS[treatmentType];
    }
  }
  return profile.defaultMinutes;
}

/**
 * Classifies a patient's arrival relative to their scheduled appointment time.
 * EARLY  = arrived more than earlyThresholdMinutes before the slot
 * ON_TIME = arrived within ±thresholds of the slot
 * LATE   = arrived more than lateThresholdMinutes after the slot
 */
export function classifyArrival(
  scheduledStart: Date,
  actualArrival: Date,
  opts: { earlyThresholdMinutes?: number; lateThresholdMinutes?: number } = {},
): ArrivalStatus {
  const { earlyThresholdMinutes = 10, lateThresholdMinutes = 5 } = opts;
  const diffMinutes = (actualArrival.getTime() - scheduledStart.getTime()) / 60000;
  if (diffMinutes < -earlyThresholdMinutes) return "EARLY";
  if (diffMinutes > lateThresholdMinutes) return "LATE";
  return "ON_TIME";
}

/** Computes actual consultation duration in minutes from call to completion. */
export function computeActualDuration(
  calledAt: Date | string,
  completedAt: Date | string,
): number {
  const start = typeof calledAt === "string" ? new Date(calledAt) : calledAt;
  const end = typeof completedAt === "string" ? new Date(completedAt) : completedAt;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

/**
 * Computes forward-looking wait time estimates for all WAITING entries.
 *
 * @param activeEntry  The patient currently IN_CONSULTATION or CALLED (null if nobody).
 * @param waitingEntries  All WAITING entries — will be ranked internally.
 * @param profile  Doctor's duration profile (from doctor_treatment_stats + defaults).
 * @param now  Reference timestamp (defaults to Date.now()).
 */
export function computeQueueEstimates(opts: {
  waitingEntries: QueueEntryInput[];
  activeEntry: QueueEntryInput | null;
  profile: DoctorDurationProfile;
  now?: Date;
}): QueuePositionEstimate[] {
  const now = opts.now ?? new Date();

  // Minutes until the current patient is done
  let cumulativeMinutes = 0;
  if (opts.activeEntry) {
    const activeDuration = getEstimatedDuration(opts.activeEntry.treatmentType, opts.profile);
    if (opts.activeEntry.calledAt) {
      const elapsedMinutes = (now.getTime() - opts.activeEntry.calledAt.getTime()) / 60000;
      cumulativeMinutes = Math.max(0, activeDuration - elapsedMinutes);
    } else {
      cumulativeMinutes = activeDuration;
    }
  }

  const ranked = rankQueueEntries(opts.waitingEntries);

  return ranked.map((entry, index) => {
    const duration = getEstimatedDuration(entry.treatmentType, opts.profile);
    const startMs = now.getTime() + cumulativeMinutes * 60000;
    const estimate: QueuePositionEstimate = {
      entryId: entry.id,
      positionFromNow: index + 1,
      estimatedStartTime: new Date(startMs),
      estimatedEndTime: new Date(startMs + duration * 60000),
      estimatedWaitMinutes: Math.ceil(cumulativeMinutes),
    };
    cumulativeMinutes += duration;
    return estimate;
  });
}
