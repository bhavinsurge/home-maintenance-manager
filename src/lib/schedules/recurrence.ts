import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { ScheduleFrequency } from "@homestead/database";
import { validationError } from "@/lib/errors/app-error";

export function computeNextDueDate(
  frequency: ScheduleFrequency,
  from: Date,
  intervalDays?: number | null,
): Date | null {
  switch (frequency) {
    case ScheduleFrequency.ONCE:
      return null;
    case ScheduleFrequency.WEEKLY:
      return addWeeks(from, 1);
    case ScheduleFrequency.MONTHLY:
      return addMonths(from, 1);
    case ScheduleFrequency.QUARTERLY:
      return addMonths(from, 3);
    case ScheduleFrequency.SEMIANNUAL:
      return addMonths(from, 6);
    case ScheduleFrequency.ANNUAL:
      return addYears(from, 1);
    case ScheduleFrequency.CUSTOM_DAYS: {
      if (!intervalDays || intervalDays < 1) {
        throw validationError("intervalDays must be >= 1 for CUSTOM_DAYS frequency");
      }
      return addDays(from, intervalDays);
    }
    default:
      throw validationError("Unsupported schedule frequency");
  }
}
