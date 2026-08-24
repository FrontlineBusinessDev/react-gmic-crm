import { addDays, format, isToday, set, startOfWeek } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseJobTime,
  minutesToTimelineOffsetPx,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_EVENT_HEIGHT_PX,
} from "@/lib/schedule-time";
import type { ScheduleJob, JobStatus } from "@/types";

interface TimelineViewProps {
  /** 1 for Day view, 7 for Week view. */
  daysToShow: 1 | 7;
  /** For week mode the visible range is startOfWeek(anchorDate)..+6. For day mode it's just anchorDate. */
  anchorDate: Date;
  jobsByDate: Map<string, ScheduleJob[]>;
  statusDot: Record<JobStatus, string>;
  onJobClick: (job: ScheduleJob) => void;
  onSlotClick: (iso: string, time?: string) => void;
}

export function TimelineView({
  daysToShow,
  anchorDate,
  jobsByDate,
  statusDot,
  onJobClick,
  onSlotClick,
}: TimelineViewProps) {
  const rangeStart = daysToShow === 7 ? startOfWeek(anchorDate) : anchorDate;
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(rangeStart, i));
  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
    (_, i) => TIMELINE_START_HOUR + i,
  );
  const gridTemplateColumns = `64px repeat(${daysToShow}, minmax(120px, 1fr))`;

  const dayColumns = days.map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    const jobs = jobsByDate.get(iso) ?? [];
    const positioned = jobs
      .map((job) => ({ job, offset: minutesToTimelineOffsetPx(parseJobTime(job.time)) }))
      .filter((x): x is { job: ScheduleJob; offset: number } => x.offset !== null);
    const unscheduled = jobs.filter(
      (job) => minutesToTimelineOffsetPx(parseJobTime(job.time)) === null,
    );
    return { day, iso, positioned, unscheduled };
  });

  const hasUnscheduled = dayColumns.some((c) => c.unscheduled.length > 0);

  return (
    <div className="overflow-auto rounded-lg border border-ink-100 bg-white">
      <div className="min-w-fit">
        {/* Date header row */}
        <div
          className="sticky top-0 z-10 grid border-b border-ink-100 bg-white"
          style={{ gridTemplateColumns }}
        >
          <div />
          {dayColumns.map(({ day, iso }) => (
            <div
              key={iso}
              className={cn(
                "border-l border-ink-100 py-2 text-center",
                isToday(day) && "bg-brand-blue-50",
              )}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday(day) ? "bg-brand-blue-500 text-white" : "text-ink-700",
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Unscheduled row — jobs with unparseable/out-of-window times */}
        {hasUnscheduled && (
          <div
            className="grid border-b border-ink-100 bg-ink-50/50"
            style={{ gridTemplateColumns }}
          >
            <div className="px-1 py-1 text-[10px] font-medium text-ink-400">Unscheduled</div>
            {dayColumns.map(({ iso, unscheduled }) => (
              <div key={iso} className="flex flex-wrap gap-1 border-l border-ink-100 p-1">
                {unscheduled.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onJobClick(job)}
                    className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-ink-100"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[job.status])} />
                    <span className="truncate">
                      {job.time} {job.title}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Hour grid + positioned events */}
        <div className="grid" style={{ gridTemplateColumns }}>
          <div>
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: TIMELINE_HOUR_HEIGHT_PX }}
                className="border-b border-ink-100 pr-2 text-right text-[10px] text-ink-400"
              >
                {format(set(new Date(), { hours: h, minutes: 0 }), "h a")}
              </div>
            ))}
          </div>

          {dayColumns.map(({ day, iso, positioned }) => (
            <div key={iso} className="relative border-l border-ink-100">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() =>
                    onSlotClick(iso, format(set(new Date(), { hours: h, minutes: 0 }), "h:mm a"))
                  }
                  style={{ height: TIMELINE_HOUR_HEIGHT_PX }}
                  className={cn(
                    "group flex w-full items-center justify-center border-b border-ink-100 hover:bg-ink-50/60",
                    isToday(day) && "bg-brand-blue-50/30",
                  )}
                >
                  <span className="pointer-events-none flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-4 w-4 text-brand-blue-400" />
                  </span>
                </button>
              ))}
              {positioned.map(({ job, offset }) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJobClick(job);
                  }}
                  style={{ top: offset, height: TIMELINE_EVENT_HEIGHT_PX }}
                  className={cn(
                    "absolute left-0.5 right-0.5 z-[1] flex flex-col items-start overflow-hidden rounded px-1.5 py-1 text-left text-[11px] font-medium text-white shadow-sm",
                    statusDot[job.status],
                  )}
                >
                  <span className="w-full truncate">{job.time}</span>
                  <span className="w-full truncate">{job.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
