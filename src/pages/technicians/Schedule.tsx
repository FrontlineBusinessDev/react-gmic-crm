import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  Plus,
  MapPin,
  Clock,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  AlertTriangle,
  Pencil,
  FileUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { FilterButton } from "@/components/shared/filter-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { TimelineView } from "@/components/schedule/timeline-view";
import { JobNotesPanel } from "@/components/schedule/job-notes";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { mockUsers } from "@/data/users";
import { cn, initials } from "@/lib/utils";
import type { JobStatus, JobType, ScheduleJob } from "@/types";

const technicians = mockUsers.filter((u) => u.role === "technician");
const SCHEDULE_CSV_HEADERS = ["title", "type", "date", "time", "technicianId", "clientId", "notes"];
const validJobTypes: JobType[] = ["Survey", "Installation", "PMS Cleaning", "Repair", "Warranty Service"];
const jobTypes: (JobType | "all")[] = [
  "all",
  "Survey",
  "Installation",
  "PMS Cleaning",
  "Repair",
  "Warranty Service",
];
const jobStatuses: (JobStatus | "all")[] = [
  "all",
  "scheduled",
  "in_progress",
  "completed",
  "installed",
  "cancelled",
];

const jobStatusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  installed: "Installed",
  cancelled: "Cancelled",
};

const dateScopeOptions = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
] as const;

const statusDot: Record<JobStatus, string> = {
  scheduled: "bg-brand-cyan-500",
  in_progress: "bg-amber-500",
  completed: "bg-brand-green-500",
  installed: "bg-brand-green-500",
  cancelled: "bg-brand-crimson-500",
};

const MAX_PILLS_PER_DAY = 3;

const legendItems: { color: string; label: string }[] = [
  { color: "bg-brand-cyan-500", label: "Scheduled" },
  { color: "bg-amber-500", label: "In Progress" },
  { color: "bg-brand-green-500", label: "Completed / Installed" },
  { color: "bg-brand-crimson-500", label: "Cancelled" },
];

export default function Schedule() {
  const {
    schedule,
    clients,
    serviceCatalog,
    addJob,
    updateJob,
    updateJobStatus,
    deleteJob,
    auditLog,
    addJobNote,
  } = useCrmStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeServices = useMemo(
    () => serviceCatalog.filter((s) => (s.status ?? "active") === "active"),
    [serviceCatalog],
  );
  const scheduleAuditEntries = useMemo(
    () => auditLog.filter((e) => e.module === "schedule"),
    [auditLog],
  );
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Smart default: the month grid is too dense for phones, so start narrow viewports on the mobile-friendly agenda cards instead.
  const [view, setView] = useState<"day" | "week" | "month" | "list">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
      ? "list"
      : "month",
  );
  const [anchorMonth, setAnchorMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  // Anchor date for Week/Day views only — Month view keeps its own anchorMonth/navigation untouched.
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [importOpen, setImportOpen] = useState(false);

  function goToPreviousPeriod() {
    setAnchorDate((d) => (view === "week" ? subWeeks(d, 1) : subDays(d, 1)));
  }
  function goToNextPeriod() {
    setAnchorDate((d) => (view === "week" ? addWeeks(d, 1) : addDays(d, 1)));
  }
  function goToToday() {
    setAnchorDate(new Date());
  }

  function handleScheduleImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    rows.forEach((row, i) => {
      if (!row.title || !row.date || !row.time) {
        errors.push(`Row ${i + 2}: missing required title, date, or time.`);
        return;
      }
      const type = validJobTypes.includes(row.type as JobType) ? (row.type as JobType) : "Survey";
      const client = clients.find((c) => c.id === row.clientId);
      addJob({
        title: row.title,
        type,
        status: "scheduled",
        date: row.date,
        time: row.time,
        technicianId: row.technicianId ? row.technicianId : null,
        clientId: client?.id,
        clientName: client?.name ?? row.title,
        address: client?.address ?? "",
        notes: row.notes ?? "",
      });
      successCount++;
    });
    return { successCount, errors };
  }

  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ScheduleJob | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleJob | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] =
    useState<(typeof jobTypes)[number]>("all");
  const [statusFilter, setStatusFilter] =
    useState<(typeof jobStatuses)[number]>("all");
  const [dateScope, setDateScope] = useState<"all" | "today" | "week">("all");

  const UNASSIGNED = "unassigned";
  const NO_UNIT = "no-unit";
  const emptyForm = {
    serviceId: "",
    type: "Survey" as JobType,
    date: new Date().toISOString().slice(0, 10),
    time: "9:00 AM",
    technicianId: technicians[0]?.id ?? UNASSIGNED,
    clientId: "",
    unitId: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const selectedClient = clients.find((c) => c.id === form.clientId);
  const selectedUnit = selectedClient?.units.find((u) => u.id === form.unitId);
  const selectedService = serviceCatalog.find((s) => s.id === form.serviceId);
  const computedTitle =
    selectedService && selectedClient
      ? `${selectedService.name} — ${selectedClient.name}`
      : "";

  const hasActiveFilters =
    technicianFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateScope !== "all";
  const activeFilterCount =
    (technicianFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);
  function clearFilters() {
    setTechnicianFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateScope("all");
  }

  const filteredSchedule = useMemo(() => {
    const today = new Date();
    const rangeStart =
      dateScope === "week"
        ? startOfWeek(today)
        : dateScope === "today"
          ? today
          : null;
    const rangeEnd =
      dateScope === "week"
        ? endOfWeek(today)
        : dateScope === "today"
          ? today
          : null;
    const rangeStartIso = rangeStart ? format(rangeStart, "yyyy-MM-dd") : null;
    const rangeEndIso = rangeEnd ? format(rangeEnd, "yyyy-MM-dd") : null;

    return schedule.filter((job) => {
      const matchesTech =
        technicianFilter === "all" || job.technicianId === technicianFilter;
      const matchesType = typeFilter === "all" || job.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || job.status === statusFilter;
      const matchesScope =
        !rangeStartIso ||
        (job.date >= rangeStartIso && job.date <= rangeEndIso!);
      return matchesTech && matchesType && matchesStatus && matchesScope;
    });
  }, [schedule, technicianFilter, typeFilter, statusFilter, dateScope]);

  // Smart display: index jobs by ISO date once so the month grid renders in O(days) not O(days * jobs).
  const jobsByDate = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>();
    for (const job of filteredSchedule) {
      const list = map.get(job.date);
      if (list) list.push(job);
      else map.set(job.date, [job]);
    }
    for (const list of map.values())
      list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [filteredSchedule]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorMonth));
    const end = endOfWeek(endOfMonth(anchorMonth));
    return eachDayOfInterval({ start, end });
  }, [anchorMonth]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ScheduleJob[]> = {};
    for (const job of filteredSchedule) {
      groups[job.date] = groups[job.date] ? [...groups[job.date], job] : [job];
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSchedule]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageItems: pageGroups,
    total: totalDateGroups,
  } = usePagination(groupedByDate, 7);

  const dayDialogJobs = dayDialogDate
    ? (jobsByDate.get(dayDialogDate) ?? [])
    : [];

  function openQuickAdd(iso: string, time?: string) {
    setDayDialogDate(null);
    setEditingJobId(null);
    setForm({ ...emptyForm, date: iso, time: time ?? emptyForm.time });
    setOpen(true);
  }

  function openEdit(job: ScheduleJob) {
    const matchedService = serviceCatalog.find(
      (s) => s.name === job.title.split(" — ")[0]?.trim(),
    );
    setEditingJobId(job.id);
    setForm({
      serviceId: job.serviceId ?? matchedService?.id ?? "",
      type: job.type,
      date: job.date,
      time: job.time,
      technicianId: job.technicianId ?? UNASSIGNED,
      clientId: job.clientId ?? "",
      unitId: job.unitId ?? "",
      notes: job.notes,
    });
    setActiveJob(null);
    setOpen(true);
  }

  function handleReviewAdd() {
    if (!selectedService || !selectedClient) return;
    setConfirmOpen(true);
  }

  function handleConfirmAdd() {
    if (!selectedService || !selectedClient) return;
    const technicianId = form.technicianId === UNASSIGNED ? null : form.technicianId;
    if (editingJobId) {
      updateJob(editingJobId, {
        title: computedTitle,
        type: form.type,
        status:
          schedule.find((j) => j.id === editingJobId)?.status ?? "scheduled",
        date: form.date,
        time: form.time,
        technicianId,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        address: selectedClient.address,
        unitId: selectedUnit?.id,
        notes: form.notes,
        serviceId: selectedService.id,
      });
    } else {
      addJob({
        title: computedTitle,
        type: form.type,
        status: "scheduled",
        date: form.date,
        time: form.time,
        technicianId,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        address: selectedClient.address,
        unitId: selectedUnit?.id,
        notes: form.notes,
        serviceId: selectedService.id,
      });
    }
    setForm(emptyForm);
    setEditingJobId(null);
    setConfirmOpen(false);
    setOpen(false);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteJob(deleteTarget.id);
    if (activeJob?.id === deleteTarget.id) setActiveJob(null);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician Scheduling"
        description="Visualize field team availability to avoid overbooking."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="brand"
                onClick={() => {
                  setEditingJobId(null);
                  setForm(emptyForm);
                }}
              >
                <Plus className="h-4 w-4" /> Schedule Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingJobId ? "Edit job" : "Schedule a job"}
                </DialogTitle>
                <DialogDescription>
                  {editingJobId
                    ? "Update details, reassign the technician, or change the time slot."
                    : "Assign a technician and time slot."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Combobox
                    value={form.clientId}
                    onChange={(v) => setForm({ ...form, clientId: v, unitId: "" })}
                    placeholder="Select client"
                    searchPlaceholder="Search by name, phone, or email..."
                    options={clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select
                    value={form.unitId || NO_UNIT}
                    onValueChange={(v) =>
                      setForm({ ...form, unitId: v === NO_UNIT ? "" : v })
                    }
                    disabled={!selectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_UNIT}>No specific unit</SelectItem>
                      {selectedClient?.units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.model} · {u.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient && selectedClient.units.length === 0 && (
                    <p className="text-xs text-ink-500">
                      This client has no units on record yet.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Service</Label>
                  <Select
                    value={form.serviceId}
                    onValueChange={(v) =>
                      setForm({ ...form, serviceId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {computedTitle && (
                    <p className="text-xs text-ink-500">
                      Calendar title: {computedTitle}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm({ ...form, type: v as JobType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "Survey",
                            "Installation",
                            "PMS Cleaning",
                            "Repair",
                            "Warranty Service",
                          ] as const
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Technician</Label>
                    <Select
                      value={form.technicianId}
                      onValueChange={(v) =>
                        setForm({ ...form, technicianId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {form.type === "Survey" && (
                          <SelectItem value={UNASSIGNED}>Unassigned (open for any technician)</SelectItem>
                        )}
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <DatePicker
                      value={form.date}
                      onChange={(v) => setForm({ ...form, date: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Input
                      value={form.time}
                      onChange={(e) =>
                        setForm({ ...form, time: e.target.value })
                      }
                      placeholder="9:00 AM"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={selectedClient?.address ?? ""}
                    readOnly
                    disabled
                    placeholder="Select a client to load their address"
                    className={cn(
                      "disabled:cursor-default disabled:opacity-100",
                      selectedClient && "bg-ink-100 text-ink-600",
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="brand" onClick={handleReviewAdd}>
                  {editingJobId ? "Save changes" : "Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import schedule jobs"
        description="Leave technicianId blank for an unassigned Survey job any technician can claim."
        templateHeaders={SCHEDULE_CSV_HEADERS}
        templateSampleRow={["Survey — Example Client", "Survey", "2026-09-01", "9:00 AM", "", "", "New client wants a quote"]}
        templateFilename="schedule-import-template.csv"
        onImport={handleScheduleImport}
      />

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Filters — kept in a fixed toolbar row so their position never shifts as data grows (Fitts's law) */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton activeCount={activeFilterCount} onClear={clearFilters}>
                <div className="space-y-1.5">
                  <Label className="text-xs">Technician</Label>
                  <Select
                    value={technicianFilter}
                    onValueChange={setTechnicianFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All technicians</SelectItem>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Job type</Label>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Job type" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "all" ? "All job types" : t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "all" ? "All statuses" : jobStatusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FilterButton>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-ink-500"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>

            <Select
              value={view}
              onValueChange={(v) => {
                const next = v as typeof view;
                if ((next === "week" || next === "day") && view === "month") {
                  // Land on today if it falls within the month currently shown, so the switch
                  // doesn't drop the technician onto an empty week at the start of the month.
                  const today = new Date();
                  setAnchorDate(isSameMonth(today, anchorMonth) ? today : anchorMonth);
                }
                setView(next);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="list">Agenda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
            {legendItems.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", item.color)} />
                {item.label}
              </span>
            ))}
          </div>

          <FilterTransition
            filterKey={`${view}-${technicianFilter}-${typeFilter}-${statusFilter}-${dateScope}-${anchorMonth.toISOString()}-${anchorDate.toISOString()}-${page}`}
          >
            {view === "week" || view === "day" ? (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToPreviousPeriod}
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToNextPeriod}
                      aria-label="Next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <h3 className="font-display text-base font-semibold text-ink-800">
                      {view === "week"
                        ? `Week of ${format(startOfWeek(anchorDate), "MMM d, yyyy")}`
                        : format(anchorDate, "EEEE, MMMM d, yyyy")}
                    </h3>
                  </div>
                </div>
                <TimelineView
                  daysToShow={view === "week" ? 7 : 1}
                  anchorDate={anchorDate}
                  jobsByDate={jobsByDate}
                  statusDot={statusDot}
                  onJobClick={setActiveJob}
                  onSlotClick={openQuickAdd}
                />
              </Card>
            ) : view === "month" ? (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAnchorMonth((d) => subMonths(d, 1))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAnchorMonth((d) => addMonths(d, 1))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h3 className="font-display text-base font-semibold text-ink-800 max-sm:hidden">
                      {format(anchorMonth, "MMMM yyyy")}
                    </h3>
                  </div>
                  <Select
                    value={dateScope}
                    onValueChange={(v) => {
                      setAnchorMonth(startOfMonth(new Date()));
                      setDateScope(v as typeof dateScope);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateScopeOptions.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <h3 className="font-display px-4 pt-2 text-base font-semibold text-ink-800 sm:hidden">
                  {format(anchorMonth, "MMMM yyyy")}
                </h3>

                <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div key={d} className="py-2">
                        <span className="sm:hidden">{d[0]}</span>
                        <span className="hidden sm:inline">{d}</span>
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7">
                  {monthDays.map((day) => {
                    const iso = format(day, "yyyy-MM-dd");
                    const dayJobs = jobsByDate.get(iso) ?? [];
                    const visible = dayJobs.slice(0, MAX_PILLS_PER_DAY);
                    const overflow = dayJobs.length - visible.length;
                    const inMonth = isSameMonth(day, anchorMonth);
                    const today = isToday(day);

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() =>
                          dayJobs.length > 0
                            ? setDayDialogDate(iso)
                            : openQuickAdd(iso)
                        }
                        className={cn(
                          "group relative flex min-h-[56px] flex-col gap-1 border-b border-r border-ink-100 p-1 text-left align-top transition-colors last:border-r-0 sm:min-h-[104px] sm:p-1.5",
                          inMonth
                            ? "bg-white hover:bg-ink-50/60"
                            : "bg-ink-50/40 text-ink-300 hover:bg-ink-50/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            today
                              ? "bg-brand-blue-500 text-white"
                              : inMonth
                                ? "text-ink-700"
                                : "text-ink-300",
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {/* Desktop: full time + title pills. Mobile: just enough info fits, so collapse to status dots below. */}
                        <div className="hidden flex-1 flex-col gap-1 sm:flex">
                          {visible.map((job) => (
                            <span
                              key={job.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveJob(job);
                              }}
                              className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-ink-100"
                              title={`${job.time} · ${job.title}`}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  statusDot[job.status],
                                )}
                              />
                              <span className="truncate">
                                {job.time} {job.title}
                              </span>
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span className="px-1.5 text-[10px] font-medium text-brand-blue-600">
                              +{overflow} more
                            </span>
                          )}
                          {dayJobs.length === 0 && (
                            <span className="pointer-events-none flex flex-1 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="h-5 w-5 text-brand-blue-400" />
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-wrap items-start justify-center gap-0.5 pt-0.5 sm:hidden">
                          {dayJobs.slice(0, 4).map((job) => (
                            <span
                              key={job.id}
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                statusDot[job.status],
                              )}
                            />
                          ))}
                          {dayJobs.length > 4 && (
                            <span className="text-[8px] font-medium text-ink-400">
                              +{dayJobs.length - 4}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : groupedByDate.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No jobs match your filters"
                description="Try a different filter combination, or schedule a new job."
              />
            ) : (
              <Card>
                <div className="space-y-6 p-4">
                  {pageGroups.map(([date, jobs]) => (
                    <div key={date}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {jobs.map((job) => (
                          <JobCard
                            key={job.id}
                            job={job}
                            onOpen={() => setActiveJob(job)}
                            onMarkDone={() =>
                              updateJobStatus(job.id, "completed")
                            }
                            onDelete={() => setDeleteTarget(job)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={totalDateGroups}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[7, 14, 30]}
                />
              </Card>
            )}
          </FilterTransition>
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={scheduleAuditEntries} />
        </TabsContent>
      </Tabs>

      {/* Confirm before committing — schedule conflicts and client mismatches are costly to undo in the field */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingJobId ? "Confirm changes" : "Confirm schedule"}
            </DialogTitle>
            <DialogDescription>
              {editingJobId
                ? "Review the updated details. The assigned technician will be notified."
                : "Review the details before adding this job to the calendar."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-ink-50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Job</span>
              <span className="text-right font-medium text-ink-800">
                {computedTitle}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Type</span>
              <span className="text-right text-ink-700">{form.type}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Client</span>
              <span className="text-right text-ink-700">
                {selectedClient?.name}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Address</span>
              <span className="text-right text-ink-700">
                {selectedClient?.address}
              </span>
            </div>
            {selectedUnit && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">Unit</span>
                <span className="text-right text-ink-700">
                  {selectedUnit.model} · {selectedUnit.location}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Date</span>
              <span className="text-right text-ink-700">
                {format(parseISO(form.date), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Time</span>
              <span className="text-right text-ink-700">{form.time}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Technician</span>
              <span className="text-right text-ink-700">
                {form.technicianId === UNASSIGNED
                  ? "Unassigned (open for any technician)"
                  : technicians.find((t) => t.id === form.technicianId)?.name}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Back
            </Button>
            <Button variant="brand" onClick={handleConfirmAdd}>
              {editingJobId ? "Confirm & save" : "Confirm & schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day agenda — opened from a month-grid cell so a busy day never gets cramped into the grid itself */}
      <Dialog
        open={!!dayDialogDate}
        onOpenChange={(o) => !o && setDayDialogDate(null)}
      >
        <DialogContent className="max-w-2xl">
          {dayDialogDate && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(parseISO(dayDialogDate), "EEEE, MMMM d, yyyy")}
                </DialogTitle>
                <DialogDescription>
                  {dayDialogJobs.length} job
                  {dayDialogJobs.length === 1 ? "" : "s"} scheduled
                </DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
                {dayDialogJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onOpen={() => setActiveJob(job)}
                    onMarkDone={() => updateJobStatus(job.id, "completed")}
                    onDelete={() => setDeleteTarget(job)}
                  />
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => openQuickAdd(dayDialogDate)}
                >
                  <Plus className="h-4 w-4" /> Add schedule job
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeJob} onOpenChange={(o) => !o && setActiveJob(null)}>
        <DialogContent>
          {activeJob && (
            <>
              <DialogHeader>
                <DialogTitle>{activeJob.title}</DialogTitle>
                <DialogDescription>
                  {activeJob.type} ·{" "}
                  {format(parseISO(activeJob.date), "MMM d, yyyy")} ·{" "}
                  {activeJob.time}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <JobStatusBadge status={activeJob.status} />
                  {(() => {
                    const tech = mockUsers.find(
                      (u) => u.id === activeJob.technicianId,
                    );
                    return (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className={`${tech?.avatarColor} text-[9px]`}
                          >
                            {tech ? initials(tech.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-ink-600">
                          {activeJob.technicianId ? tech?.name : "Unassigned"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 text-ink-700">
                  <MapPin className="h-4 w-4 shrink-0 text-ink-400" />{" "}
                  {activeJob.address}
                </div>
                <p className="text-ink-500">Client: {activeJob.clientName}</p>
                {activeJob.notes && (
                  <div className="rounded-lg bg-ink-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Notes
                    </p>
                    <p className="mt-1 text-ink-700">{activeJob.notes}</p>
                  </div>
                )}
                {activeJob.additionalMaterials && (
                  <div className="rounded-lg bg-ink-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Additional Materials
                    </p>
                    <div className="mt-1 space-y-0.5 text-ink-700">
                      {activeJob.additionalMaterials.excessCopperFeet != null && (
                        <p>Excess Copper: {activeJob.additionalMaterials.excessCopperFeet} ft</p>
                      )}
                      {activeJob.additionalMaterials.breaker && (
                        <p>Breaker: {activeJob.additionalMaterials.breaker}</p>
                      )}
                      {activeJob.additionalMaterials.excessElectricalWireFeet != null && (
                        <p>Excess Electrical Wire: {activeJob.additionalMaterials.excessElectricalWireFeet} ft</p>
                      )}
                      {activeJob.additionalMaterials.pvc && (
                        <p>PVC: {activeJob.additionalMaterials.pvc}</p>
                      )}
                      {activeJob.additionalMaterials.others && (
                        <p>Others: {activeJob.additionalMaterials.others}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Notes &amp; Photos
                  </p>
                  <JobNotesPanel
                    entries={activeJob.noteEntries ?? []}
                    onAddNote={(text, photos) => {
                      const authorId = currentUser?.id ?? "office";
                      const authorName = currentUser?.name ?? "You";
                      addJobNote(activeJob.id, { authorId, authorName, text, photos });
                      setActiveJob({
                        ...activeJob,
                        noteEntries: [
                          ...(activeJob.noteEntries ?? []),
                          {
                            id: `pending-${Date.now()}`,
                            authorId,
                            authorName,
                            timestamp: new Date().toISOString(),
                            text: text || undefined,
                            photos,
                          },
                        ],
                      });
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-brand-crimson-600 hover:text-brand-crimson-600"
                  onClick={() => setDeleteTarget(activeJob)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(activeJob)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {activeJob.status === "scheduled" && (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => {
                      updateJobStatus(activeJob.id, "completed");
                      setActiveJob({ ...activeJob, status: "completed" });
                    }}
                  >
                    Mark done
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — removing a job clears it from technician job lists too, so confirm first */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          {deleteTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-brand-crimson-500" />{" "}
                  Delete this schedule job?
                </DialogTitle>
                <DialogDescription>
                  "{deleteTarget.title}" on{" "}
                  {format(parseISO(deleteTarget.date), "MMM d, yyyy")} will be
                  removed from the schedule and from{" "}
                  {mockUsers.find((u) => u.id === deleteTarget.technicianId)
                    ?.name ?? "the technician"}
                  's job list. This can't be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Delete permanently
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCard({
  job,
  onOpen,
  onMarkDone,
  onDelete,
}: {
  job: ScheduleJob;
  onOpen: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const tech = mockUsers.find((u) => u.id === job.technicianId);
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onOpen}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink-800">{job.title}</p>
          <div className="flex items-center gap-1">
            <JobStatusBadge status={job.status} />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-ink-400 hover:text-brand-crimson-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete job"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <Clock className="h-3.5 w-3.5" /> {job.time} · {job.type}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`${tech?.avatarColor} text-[9px]`}>
                {tech ? initials(tech.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-ink-600">
              {job.technicianId ? tech?.name : "Unassigned"}
            </span>
          </div>
          {job.status === "scheduled" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMarkDone();
              }}
            >
              Mark done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
