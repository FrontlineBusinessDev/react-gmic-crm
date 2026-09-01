import { useMemo, useState } from "react";
import {
  MapPin,
  Clock,
  FileText,
  ClipboardList,
  History,
  RotateCcw,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  CalendarClock,
  Camera,
  X,
  Search,
  LayoutGrid,
  List as ListIcon,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FilterButton } from "@/components/shared/filter-button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RestrictedField } from "@/components/shared/restricted-field";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import { SurveyPhotoGrid } from "@/components/shared/survey-photos";
import { JobNotesPanel } from "@/components/schedule/job-notes";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore, type InstallationOutcome } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/utils";
import type { JobStatus, JobType, ScheduleJob } from "@/types";

const jobTypes: (JobType | "all")[] = [
  "all",
  "Survey",
  "Installation",
  "PMS Cleaning",
  "Repair",
  "Warranty Service",
];
const activeStatuses: (JobStatus | "all")[] = [
  "all",
  "scheduled",
  "in_progress",
];
const historyStatuses: (JobStatus | "all")[] = [
  "all",
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

type PendingAction =
  | "in_progress"
  | "scheduled"
  | "completed"
  | "installed"
  | "cancelled";

const confirmCopy: Record<
  PendingAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    variant: "brand" | "destructive";
  }
> = {
  in_progress: {
    title: "Start this job?",
    description:
      "This marks the job as in progress. Only start once you've arrived on site and are ready to begin work.",
    confirmLabel: "Start Job",
    variant: "brand",
  },
  scheduled: {
    title: "Stop this job?",
    description:
      "This undoes the accidental start and puts the job back to Scheduled. Nothing is cancelled — you can start it again when you're ready.",
    confirmLabel: "Stop Job",
    variant: "destructive",
  },
  completed: {
    title: "Mark job as completed?",
    description:
      "This confirms the work is finished. Make sure everything is done before completing — the office will be notified.",
    confirmLabel: "Mark as Completed",
    variant: "brand",
  },
  installed: {
    title: "Mark unit as installed?",
    description:
      "This confirms the installation is complete. The office will automatically get an invoice for this job, the unit's warranty will start, and the next PMS visit will be scheduled.",
    confirmLabel: "Mark Installed",
    variant: "brand",
  },
  cancelled: {
    title: "Cancel this job?",
    description:
      "This cancels the job and notifies the office. Please provide a reason before continuing.",
    confirmLabel: "Cancel Job",
    variant: "destructive",
  },
};

export default function MyJobs() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { schedule, leads, updateJobStatus, logAdditionalMaterials, addSurveyReport, claimJob, addJobNote } =
    useCrmStore();
  const [activeJob, setActiveJob] = useState<ScheduleJob | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [installOutcome, setInstallOutcome] =
    useState<InstallationOutcome | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyForm, setSurveyForm] = useState({
    findings: "",
    recommendedUnits: "",
  });
  const [surveyPhotos, setSurveyPhotos] = useState<string[]>([]);

  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materialsAction, setMaterialsAction] = useState<PendingAction | null>(null);
  const [materialsForm, setMaterialsForm] = useState({
    excessCopperFeet: "",
    breaker: "",
    excessElectricalWireFeet: "",
    pvc: "",
    others: "",
  });

  const [activeView, setActiveView] = useState<"cards" | "table">("cards");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] =
    useState<(typeof jobTypes)[number]>("all");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<(typeof activeStatuses)[number]>("all");
  const [activeSortOrder, setActiveSortOrder] = useState<"asc" | "desc">("asc");

  const [historyView, setHistoryView] = useState<"cards" | "table">("cards");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] =
    useState<(typeof jobTypes)[number]>("all");
  const [historyStatusFilter, setHistoryStatusFilter] =
    useState<(typeof historyStatuses)[number]>("all");

  const technicianJobs = useMemo(
    () => schedule.filter((j) => j.technicianId === currentUser?.id),
    [schedule, currentUser],
  );

  // Open Survey jobs not yet claimed by anyone — any technician can pick these up,
  // e.g. to cover a survey outside their own assigned client list.
  const unassignedJobs = useMemo(
    () =>
      schedule
        .filter((j) => j.technicianId === null && j.status === "scheduled")
        .sort((a, b) => a.date.localeCompare(b.date)),
    [schedule],
  );

  function handleClaim(jobId: string) {
    if (!currentUser) return;
    claimJob(jobId, currentUser.id);
    setActiveJob(null);
  }

  const activeJobs = useMemo(
    () =>
      technicianJobs
        .filter((j) => j.status === "scheduled" || j.status === "in_progress")
        .sort((a, b) => a.date.localeCompare(b.date)),
    [technicianJobs],
  );

  const jobHistory = useMemo(
    () =>
      technicianJobs
        .filter(
          (j) =>
            j.status === "completed" ||
            j.status === "installed" ||
            j.status === "cancelled",
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [technicianJobs],
  );

  const filteredActiveJobs = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();
    return activeJobs.filter((j) => {
      const matchesQuery =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q);
      const matchesType =
        activeTypeFilter === "all" || j.type === activeTypeFilter;
      const matchesStatus =
        activeStatusFilter === "all" || j.status === activeStatusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [activeJobs, activeQuery, activeTypeFilter, activeStatusFilter]);

  const sortedActiveJobs = useMemo(() => {
    const sorted = [...filteredActiveJobs].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
    );
    return activeSortOrder === "asc" ? sorted : sorted.reverse();
  }, [filteredActiveJobs, activeSortOrder]);

  const filteredJobHistory = useMemo(() => {
    const q = historyQuery.toLowerCase().trim();
    return jobHistory.filter((j) => {
      const matchesQuery =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q);
      const matchesType =
        historyTypeFilter === "all" || j.type === historyTypeFilter;
      const matchesStatus =
        historyStatusFilter === "all" || j.status === historyStatusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [jobHistory, historyQuery, historyTypeFilter, historyStatusFilter]);

  const activePagination = usePagination(sortedActiveJobs, 6);
  const historyPagination = usePagination(filteredJobHistory, 6);

  const hasActiveJobsFilters =
    activeQuery.trim() !== "" ||
    activeTypeFilter !== "all" ||
    activeStatusFilter !== "all" ||
    activeSortOrder !== "asc";
  const hasHistoryFilters =
    historyQuery.trim() !== "" ||
    historyTypeFilter !== "all" ||
    historyStatusFilter !== "all";
  const activeFilterCount =
    (activeTypeFilter !== "all" ? 1 : 0) +
    (activeStatusFilter !== "all" ? 1 : 0) +
    (activeSortOrder !== "asc" ? 1 : 0);
  const historyFilterCount =
    (historyTypeFilter !== "all" ? 1 : 0) +
    (historyStatusFilter !== "all" ? 1 : 0);

  function clearActiveFilters() {
    setActiveQuery("");
    setActiveTypeFilter("all");
    setActiveStatusFilter("all");
    setActiveSortOrder("asc");
  }

  function clearHistoryFilters() {
    setHistoryQuery("");
    setHistoryTypeFilter("all");
    setHistoryStatusFilter("all");
  }

  const relatedSurvey = activeJob
    ? leads.find((l) => l.clientName === activeJob.clientName)?.surveyReport
    : undefined;

  function requestStatusChange(action: PendingAction) {
    setCancelReason("");
    setPendingAction(action);
  }

  function confirmStatusChange() {
    if (!activeJob || !pendingAction) return;
    if (pendingAction === "cancelled" && !cancelReason.trim()) return;
    const outcome = updateJobStatus(
      activeJob.id,
      pendingAction as JobStatus,
      pendingAction === "cancelled" ? cancelReason.trim() : undefined,
    );
    if (pendingAction === "in_progress" || pendingAction === "scheduled") {
      setActiveJob({ ...activeJob, status: pendingAction });
    } else {
      setActiveJob(null);
    }
    setPendingAction(null);
    setCancelReason("");
    if (pendingAction === "installed" && outcome) {
      setInstallOutcome(outcome);
    }
  }

  function openSurveyForm() {
    setSurveyForm({ findings: "", recommendedUnits: "" });
    setSurveyPhotos([]);
    setSurveyOpen(true);
  }

  function handlePhotoSelect(files: File[]) {
    const urls = files.map((f) => URL.createObjectURL(f));
    setSurveyPhotos((prev) => [...prev, ...urls]);
  }

  function removeSurveyPhoto(url: string) {
    setSurveyPhotos((prev) => prev.filter((p) => p !== url));
    URL.revokeObjectURL(url);
  }

  function submitSurveyReport() {
    if (!activeJob || !currentUser || !surveyForm.findings) return;
    const lead = leads.find((l) => l.clientName === activeJob.clientName);
    if (lead) {
      addSurveyReport(lead.id, {
        submittedBy: currentUser.name,
        findings: surveyForm.findings,
        recommendedUnits: surveyForm.recommendedUnits,
        photos: surveyPhotos,
      });
    }
    updateJobStatus(activeJob.id, "completed");
    setSurveyOpen(false);
    setActiveJob(null);
  }

  function openMaterialsForm(action: PendingAction) {
    setMaterialsForm({
      excessCopperFeet: "",
      breaker: "",
      excessElectricalWireFeet: "",
      pvc: "",
      others: "",
    });
    setMaterialsAction(action);
    setMaterialsOpen(true);
  }

  function submitMaterialsForm() {
    if (!activeJob || !materialsAction) return;
    const hasAny =
      materialsForm.excessCopperFeet ||
      materialsForm.breaker ||
      materialsForm.excessElectricalWireFeet ||
      materialsForm.pvc ||
      materialsForm.others;
    if (hasAny) {
      logAdditionalMaterials(activeJob.id, {
        excessCopperFeet: materialsForm.excessCopperFeet ? Number(materialsForm.excessCopperFeet) : undefined,
        breaker: materialsForm.breaker || undefined,
        excessElectricalWireFeet: materialsForm.excessElectricalWireFeet ? Number(materialsForm.excessElectricalWireFeet) : undefined,
        pvc: materialsForm.pvc || undefined,
        others: materialsForm.others || undefined,
      });
    }
    setMaterialsOpen(false);
    requestStatusChange(materialsAction);
    setMaterialsAction(null);
  }

  function renderJobGrid(
    pagination: ReturnType<typeof usePagination<ScheduleJob>>,
  ) {
    return (
      <Card>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagination.pageItems.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setActiveJob(job)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-800">
                    {job.title}
                  </p>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-600">
                  {job.type}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <Clock className="h-3.5 w-3.5" /> {formatDate(job.date)} ·{" "}
                  {job.time}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeOptions={[6, 12, 24]}
        />
      </Card>
    );
  }

  function renderJobTable(
    pagination: ReturnType<typeof usePagination<ScheduleJob>>,
  ) {
    return (
      <Card>
        {/* Desktop: full table. Mobile: card list so nothing gets clipped by horizontal scroll in the field. */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map((job) => (
                <TableRow
                  key={job.id}
                  className="cursor-pointer"
                  onClick={() => setActiveJob(job)}
                >
                  <TableCell className="font-medium text-ink-800">
                    {job.title}
                  </TableCell>
                  <TableCell className="text-sm text-ink-600">
                    {job.type}
                  </TableCell>
                  <TableCell className="text-sm text-ink-600">
                    {formatDate(job.date)} · {job.time}
                  </TableCell>
                  <TableCell className="text-sm text-ink-600">
                    {job.address}
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:hidden">
          {pagination.pageItems.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setActiveJob(job)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-800">
                    {job.title}
                  </p>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-600">
                  {job.type}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <Clock className="h-3.5 w-3.5" /> {formatDate(job.date)} ·{" "}
                  {job.time}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeOptions={[6, 12, 24]}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Jobs"
        description="Your assigned field visits. Client contact details and pricing are managed by the office."
      />

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Jobs</TabsTrigger>
          <TabsTrigger value="surveys">
            <ClipboardList className="h-3.5 w-3.5" /> Available Surveys
            {unassignedJobs.length > 0 && (
              <span className="ml-1 rounded-full bg-brand-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unassignedJobs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5" /> Job History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No jobs assigned"
              description="Jobs scheduled for you by the office will appear here."
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                    <Input
                      value={activeQuery}
                      onChange={(e) => setActiveQuery(e.target.value)}
                      placeholder="Search job, client, address..."
                      className="pl-9"
                    />
                  </div>
                  <FilterButton activeCount={activeFilterCount} onClear={clearActiveFilters}>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Job type</Label>
                      <Select
                        value={activeTypeFilter}
                        onValueChange={(v) =>
                          setActiveTypeFilter(v as typeof activeTypeFilter)
                        }
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
                        value={activeStatusFilter}
                        onValueChange={(v) =>
                          setActiveStatusFilter(v as typeof activeStatusFilter)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s === "all" ? "All statuses" : jobStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sort by date &amp; time</Label>
                      <Select
                        value={activeSortOrder}
                        onValueChange={(v) =>
                          setActiveSortOrder(v as typeof activeSortOrder)
                        }
                      >
                        {/* Direction arrow lives in the trigger, not in the items: Radix clones item
                            children into the trigger, so an icon there overflows the fixed width. */}
                        <SelectTrigger className="w-full">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {activeSortOrder === "asc" ? (
                              <ArrowUpNarrowWide className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                            ) : (
                              <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                            )}
                            <span className="truncate">
                              <SelectValue placeholder="Sort by date & time" />
                            </span>
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Earliest first</SelectItem>
                          <SelectItem value="desc">Latest first</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FilterButton>
                  {hasActiveJobsFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveFilters}
                      className="text-ink-500"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </Button>
                  )}
                </div>

                <Tabs
                  value={activeView}
                  onValueChange={(v) => setActiveView(v as typeof activeView)}
                >
                  <TabsList>
                    <TabsTrigger value="cards">
                      <LayoutGrid className="h-3.5 w-3.5" /> Cards
                    </TabsTrigger>
                    <TabsTrigger value="table">
                      <ListIcon className="h-3.5 w-3.5" /> Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {filteredActiveJobs.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No jobs match your filters"
                  description="Try a different search term or clear filters."
                />
              ) : (
                <FilterTransition
                  filterKey={`active-${activeView}-${activeQuery}-${activeTypeFilter}-${activeStatusFilter}-${activeSortOrder}-${activePagination.page}`}
                >
                  {activeView === "cards"
                    ? renderJobGrid(activePagination)
                    : renderJobTable(activePagination)}
                </FilterTransition>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="surveys" className="space-y-6">
          {unassignedJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No open surveys right now"
              description="Unassigned survey visits that anyone on the team can pick up will show up here."
            />
          ) : (
            <Card>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {unassignedJobs.map((job) => (
                  <Card key={job.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink-800">{job.title}</p>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-600">
                        {job.type}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-ink-500">
                        <Clock className="h-3.5 w-3.5" /> {formatDate(job.date)} · {job.time}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}
                      </div>
                      {job.notes && (
                        <p className="text-xs text-ink-500 line-clamp-2">{job.notes}</p>
                      )}
                      <Button variant="brand" size="sm" className="w-full" onClick={() => handleClaim(job.id)}>
                        Claim This Survey
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {jobHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="No completed jobs yet"
              description="Jobs you finish or cancel will show up here for your records."
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                    <Input
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Search job, client, address..."
                      className="pl-9"
                    />
                  </div>
                  <FilterButton activeCount={historyFilterCount} onClear={clearHistoryFilters}>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Job type</Label>
                      <Select
                        value={historyTypeFilter}
                        onValueChange={(v) =>
                          setHistoryTypeFilter(v as typeof historyTypeFilter)
                        }
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
                        value={historyStatusFilter}
                        onValueChange={(v) =>
                          setHistoryStatusFilter(v as typeof historyStatusFilter)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {historyStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s === "all" ? "All statuses" : jobStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FilterButton>
                  {hasHistoryFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistoryFilters}
                      className="text-ink-500"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </Button>
                  )}
                </div>

                <Tabs
                  value={historyView}
                  onValueChange={(v) => setHistoryView(v as typeof historyView)}
                >
                  <TabsList>
                    <TabsTrigger value="cards">
                      <LayoutGrid className="h-3.5 w-3.5" /> Cards
                    </TabsTrigger>
                    <TabsTrigger value="table">
                      <ListIcon className="h-3.5 w-3.5" /> Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {filteredJobHistory.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No jobs match your filters"
                  description="Try a different search term or clear filters."
                />
              ) : (
                <FilterTransition
                  filterKey={`history-${historyView}-${historyQuery}-${historyTypeFilter}-${historyStatusFilter}-${historyPagination.page}`}
                >
                  {historyView === "cards"
                    ? renderJobGrid(historyPagination)
                    : renderJobTable(historyPagination)}
                </FilterTransition>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!activeJob} onOpenChange={(o) => !o && setActiveJob(null)}>
        <DialogContent>
          {activeJob && (
            <>
              <DialogHeader>
                <DialogTitle>{activeJob.title}</DialogTitle>
                <DialogDescription>
                  {activeJob.type} ·{" "}
                  <JobStatusBadge status={activeJob.status} />
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-ink-700">
                  <Clock className="h-4 w-4 text-ink-400" />{" "}
                  {formatDate(activeJob.date)} at {activeJob.time}
                </div>
                <div className="flex items-center gap-2 text-ink-700">
                  <MapPin className="h-4 w-4 shrink-0 text-ink-400" />{" "}
                  {activeJob.address}
                </div>

                <div className="rounded-lg bg-ink-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Job Notes
                  </p>
                  <p className="mt-1 text-ink-700">
                    {activeJob.notes || "No additional notes."}
                  </p>
                </div>

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

                {relatedSurvey && (
                  <div className="rounded-lg border border-brand-cyan-500/30 bg-brand-cyan-500/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-cyan-700">
                      <FileText className="h-3.5 w-3.5" /> Survey Report
                    </p>
                    <p className="mt-1 text-ink-700">
                      {relatedSurvey.findings}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Recommended: {relatedSurvey.recommendedUnits}
                    </p>
                    <SurveyPhotoGrid photos={relatedSurvey.photos} />
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Notes &amp; Photos
                  </p>
                  <JobNotesPanel
                    entries={activeJob.noteEntries ?? []}
                    onAddNote={(text, photos) => {
                      if (!currentUser) return;
                      addJobNote(activeJob.id, {
                        authorId: currentUser.id,
                        authorName: currentUser.name,
                        text,
                        photos,
                      });
                      setActiveJob({
                        ...activeJob,
                        noteEntries: [
                          ...(activeJob.noteEntries ?? []),
                          {
                            id: `pending-${Date.now()}`,
                            authorId: currentUser.id,
                            authorName: currentUser.name,
                            timestamp: new Date().toISOString(),
                            text: text || undefined,
                            photos,
                          },
                        ],
                      });
                    }}
                  />
                </div>

                {activeJob.status === "cancelled" && activeJob.cancellationReason && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Cancellation Reason
                    </p>
                    <p className="mt-1 text-ink-700">
                      {activeJob.cancellationReason}
                    </p>
                  </div>
                )}

                <RestrictedField label="Client contact & pricing" />
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {activeJob.status === "scheduled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestStatusChange("in_progress")}
                  >
                    Start Job
                  </Button>
                )}
                {activeJob.status === "in_progress" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestStatusChange("scheduled")}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Stop Job
                  </Button>
                )}
                {(activeJob.status === "scheduled" ||
                  activeJob.status === "in_progress") &&
                  (activeJob.type === "Installation" ? (
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => openMaterialsForm("installed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Installed
                    </Button>
                  ) : activeJob.type === "Survey" ? (
                    <Button variant="brand" size="sm" onClick={openSurveyForm}>
                      <Camera className="h-3.5 w-3.5" /> Submit Survey Report
                    </Button>
                  ) : (
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => openMaterialsForm("completed")}
                    >
                      Mark as Completed
                    </Button>
                  ))}
                {(activeJob.status === "scheduled" ||
                  activeJob.status === "in_progress") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => requestStatusChange("cancelled")}
                  >
                    <X className="h-3.5 w-3.5" /> Cancel Job
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm before changing job status — protects against accidental taps and lets a mis-started job be corrected */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(o) => !o && setPendingAction(null)}
      >
        <DialogContent>
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmCopy[pendingAction].title}</DialogTitle>
                <DialogDescription>
                  {confirmCopy[pendingAction].description}
                </DialogDescription>
              </DialogHeader>
              {activeJob && (
                <div className="space-y-1 rounded-lg bg-ink-50 p-3 text-sm">
                  <p className="font-medium text-ink-800">{activeJob.title}</p>
                  <p className="text-ink-500">
                    {formatDate(activeJob.date)} · {activeJob.time} ·{" "}
                    {activeJob.address}
                  </p>
                </div>
              )}
              {pendingAction === "cancelled" && (
                <div className="space-y-1.5">
                  <Label>Reason for cancellation</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Client requested reschedule, no access to unit..."
                  />
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingAction(null)}
                >
                  Back
                </Button>
                <Button
                  variant={confirmCopy[pendingAction].variant}
                  onClick={confirmStatusChange}
                  disabled={
                    pendingAction === "cancelled" && !cancelReason.trim()
                  }
                >
                  {confirmCopy[pendingAction].confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Post-install summary — shows the office-side workflow this status change just triggered */}
      <Dialog
        open={!!installOutcome}
        onOpenChange={(o) => !o && setInstallOutcome(null)}
      >
        <DialogContent>
          {installOutcome && (
            <>
              <DialogHeader>
                <DialogTitle>Installation complete</DialogTitle>
                <DialogDescription>
                  The office has been notified — here's what happened
                  automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue-600" />
                  <div>
                    <p className="font-medium text-ink-800">
                      Invoice {installOutcome.invoiceNumber} created
                    </p>
                    <p className="text-xs text-ink-500">
                      The Financial team has been notified to follow up on payment.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-600" />
                  <div>
                    <p className="font-medium text-ink-800">
                      Warranty active until{" "}
                      {formatDate(installOutcome.warrantyExpiresOn)}
                    </p>
                    <p className="text-xs text-ink-500">
                      Tracked on the client's unit record.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan-600" />
                  <div>
                    <p className="font-medium text-ink-800">
                      Next PMS visit scheduled for{" "}
                      {formatDate(installOutcome.nextPmsDate)}
                    </p>
                    <p className="text-xs text-ink-500">
                      Added to the team calendar.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="brand" onClick={() => setInstallOutcome(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Survey report submission — real photo upload (local object URLs, no backend) attached to the client's lead record */}
      <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit survey report</DialogTitle>
            <DialogDescription>
              {activeJob?.clientName} — findings and photos go straight to the
              client's record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Findings</Label>
              <Textarea
                value={surveyForm.findings}
                onChange={(e) =>
                  setSurveyForm({ ...surveyForm, findings: e.target.value })
                }
                placeholder="Space assessment, existing setup, constraints..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recommended unit(s)</Label>
              <Input
                value={surveyForm.recommendedUnits}
                onChange={(e) =>
                  setSurveyForm({
                    ...surveyForm,
                    recommendedUnits: e.target.value,
                  })
                }
                placeholder="e.g. 1.5HP Split Type x2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Photos</Label>
              <FileDropZone
                accept="image/*"
                multiple
                onFilesSelected={handlePhotoSelect}
                label="Drag & drop photos here, or click to browse"
              />
              {surveyPhotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {surveyPhotos.map((url) => (
                    <div key={url} className="group relative">
                      <img
                        src={url}
                        alt="Survey upload"
                        className="h-16 w-16 rounded-md border border-ink-100 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSurveyPhoto(url)}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-ink-800 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={!surveyForm.findings}
              onClick={submitSurveyReport}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Additional materials used</DialogTitle>
            <DialogDescription>
              Log any extra materials used on this job, for office records. Leave anything not used blank.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Excess Copper (in feet)</Label>
              <Input
                type="number"
                min={0}
                value={materialsForm.excessCopperFeet}
                onChange={(e) => setMaterialsForm({ ...materialsForm, excessCopperFeet: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Breaker</Label>
              <Input
                value={materialsForm.breaker}
                onChange={(e) => setMaterialsForm({ ...materialsForm, breaker: e.target.value })}
                placeholder="e.g. 20A x1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Excess Electrical Wire (in feet)</Label>
              <Input
                type="number"
                min={0}
                value={materialsForm.excessElectricalWireFeet}
                onChange={(e) => setMaterialsForm({ ...materialsForm, excessElectricalWireFeet: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>PVC</Label>
              <Input
                value={materialsForm.pvc}
                onChange={(e) => setMaterialsForm({ ...materialsForm, pvc: e.target.value })}
                placeholder="e.g. 2 pcs 1/2 in"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Others</Label>
              <Input
                value={materialsForm.others}
                onChange={(e) => setMaterialsForm({ ...materialsForm, others: e.target.value })}
                placeholder="Anything else used"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMaterialsOpen(false);
                setMaterialsAction(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="brand" onClick={submitMaterialsForm}>
              Save &amp; Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
