import { useMemo, useRef, useState } from "react";
import { MapPin, Clock, FileText, ClipboardList, History, RotateCcw, CheckCircle2, Receipt, ShieldCheck, CalendarClock, Camera, X, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { SurveyPhotoGrid } from "@/components/shared/survey-photos";
import { useCrmStore, type InstallationOutcome } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/utils";
import type { JobStatus, ScheduleJob } from "@/types";

type PendingAction = "in_progress" | "scheduled" | "completed" | "installed";

const confirmCopy: Record<PendingAction, { title: string; description: string; confirmLabel: string; variant: "brand" | "destructive" }> = {
  in_progress: {
    title: "Start this job?",
    description: "This marks the job as in progress. Only start once you've arrived on site and are ready to begin work.",
    confirmLabel: "Start Job",
    variant: "brand",
  },
  scheduled: {
    title: "Stop this job?",
    description: "This undoes the accidental start and puts the job back to Scheduled. Nothing is cancelled — you can start it again when you're ready.",
    confirmLabel: "Stop Job",
    variant: "destructive",
  },
  completed: {
    title: "Mark job as completed?",
    description: "This confirms the work is finished. Make sure everything is done before completing — the office will be notified.",
    confirmLabel: "Mark as Completed",
    variant: "brand",
  },
  installed: {
    title: "Mark unit as installed?",
    description: "This confirms the installation is complete. The office will automatically get an invoice for this job, the unit's warranty will start, and the next PMS visit will be scheduled.",
    confirmLabel: "Mark Installed",
    variant: "brand",
  },
};

export default function MyJobs() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { schedule, leads, updateJobStatus, addSurveyReport, moveLeadStage } = useCrmStore();
  const [activeJob, setActiveJob] = useState<ScheduleJob | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [installOutcome, setInstallOutcome] = useState<InstallationOutcome | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ findings: "", recommendedUnits: "" });
  const [surveyPhotos, setSurveyPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const technicianJobs = useMemo(
    () => schedule.filter((j) => j.technicianId === currentUser?.id),
    [schedule, currentUser]
  );

  const activeJobs = useMemo(
    () =>
      technicianJobs
        .filter((j) => j.status === "scheduled" || j.status === "in_progress")
        .sort((a, b) => a.date.localeCompare(b.date)),
    [technicianJobs]
  );

  const jobHistory = useMemo(
    () =>
      technicianJobs
        .filter((j) => j.status === "completed" || j.status === "installed" || j.status === "cancelled")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [technicianJobs]
  );

  const relatedSurvey = activeJob ? leads.find((l) => l.clientName === activeJob.clientName)?.surveyReport : undefined;

  function requestStatusChange(action: PendingAction) {
    setPendingAction(action);
  }

  function confirmStatusChange() {
    if (!activeJob || !pendingAction) return;
    const outcome = updateJobStatus(activeJob.id, pendingAction as JobStatus);
    if (pendingAction === "in_progress" || pendingAction === "scheduled") {
      setActiveJob({ ...activeJob, status: pendingAction });
    } else {
      setActiveJob(null);
    }
    setPendingAction(null);
    if (pendingAction === "installed" && outcome) {
      setInstallOutcome(outcome);
    }
  }

  function openSurveyForm() {
    setSurveyForm({ findings: "", recommendedUnits: "" });
    setSurveyPhotos([]);
    setSurveyOpen(true);
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
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
      if (lead.stage === "inquiry") moveLeadStage(lead.id, "survey_done");
    }
    updateJobStatus(activeJob.id, "completed");
    setSurveyOpen(false);
    setActiveJob(null);
  }

  function renderJobGrid(jobs: ScheduleJob[]) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setActiveJob(job)}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink-800">{job.title}</p>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-600">{job.type}</p>
              <div className="flex items-center gap-1.5 text-xs text-ink-500"><Clock className="h-3.5 w-3.5" /> {formatDate(job.date)} · {job.time}</div>
              <div className="flex items-center gap-1.5 text-xs text-ink-500"><MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}</div>
            </CardContent>
          </Card>
        ))}
      </div>
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
          <TabsTrigger value="history"><History className="h-3.5 w-3.5" /> Job History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeJobs.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No jobs assigned" description="Jobs scheduled for you by the office will appear here." />
          ) : (
            renderJobGrid(activeJobs)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {jobHistory.length === 0 ? (
            <EmptyState icon={History} title="No completed jobs yet" description="Jobs you finish or cancel will show up here for your records." />
          ) : (
            renderJobGrid(jobHistory)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!activeJob} onOpenChange={(o) => !o && setActiveJob(null)}>
        <DialogContent>
          {activeJob && (
            <>
              <DialogHeader>
                <DialogTitle>{activeJob.title}</DialogTitle>
                <DialogDescription>{activeJob.type} · <JobStatusBadge status={activeJob.status} /></DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-ink-700"><Clock className="h-4 w-4 text-ink-400" /> {formatDate(activeJob.date)} at {activeJob.time}</div>
                <div className="flex items-center gap-2 text-ink-700"><MapPin className="h-4 w-4 shrink-0 text-ink-400" /> {activeJob.address}</div>

                <div className="rounded-lg bg-ink-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Job Notes</p>
                  <p className="mt-1 text-ink-700">{activeJob.notes || "No additional notes."}</p>
                </div>

                {relatedSurvey && (
                  <div className="rounded-lg border border-brand-cyan-500/30 bg-brand-cyan-500/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-cyan-700">
                      <FileText className="h-3.5 w-3.5" /> Survey Report
                    </p>
                    <p className="mt-1 text-ink-700">{relatedSurvey.findings}</p>
                    <p className="mt-1 text-xs text-ink-500">Recommended: {relatedSurvey.recommendedUnits}</p>
                    <SurveyPhotoGrid photos={relatedSurvey.photos} />
                  </div>
                )}

                <RestrictedField label="Client contact & pricing" />
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {activeJob.status === "scheduled" && (
                  <Button variant="outline" size="sm" onClick={() => requestStatusChange("in_progress")}>
                    Start Job
                  </Button>
                )}
                {activeJob.status === "in_progress" && (
                  <Button variant="outline" size="sm" onClick={() => requestStatusChange("scheduled")}>
                    <RotateCcw className="h-3.5 w-3.5" /> Stop Job
                  </Button>
                )}
                {(activeJob.status === "scheduled" || activeJob.status === "in_progress") &&
                  (activeJob.type === "Installation" ? (
                    <Button variant="brand" size="sm" onClick={() => requestStatusChange("installed")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Installed
                    </Button>
                  ) : activeJob.type === "Survey" ? (
                    <Button variant="brand" size="sm" onClick={openSurveyForm}>
                      <Camera className="h-3.5 w-3.5" /> Submit Survey Report
                    </Button>
                  ) : (
                    <Button variant="brand" size="sm" onClick={() => requestStatusChange("completed")}>
                      Mark as Completed
                    </Button>
                  ))}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm before changing job status — protects against accidental taps and lets a mis-started job be corrected */}
      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent>
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmCopy[pendingAction].title}</DialogTitle>
                <DialogDescription>{confirmCopy[pendingAction].description}</DialogDescription>
              </DialogHeader>
              {activeJob && (
                <div className="space-y-1 rounded-lg bg-ink-50 p-3 text-sm">
                  <p className="font-medium text-ink-800">{activeJob.title}</p>
                  <p className="text-ink-500">{formatDate(activeJob.date)} · {activeJob.time} · {activeJob.address}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingAction(null)}>Back</Button>
                <Button variant={confirmCopy[pendingAction].variant} onClick={confirmStatusChange}>
                  {confirmCopy[pendingAction].confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Post-install summary — shows the office-side workflow this status change just triggered */}
      <Dialog open={!!installOutcome} onOpenChange={(o) => !o && setInstallOutcome(null)}>
        <DialogContent>
          {installOutcome && (
            <>
              <DialogHeader>
                <DialogTitle>Installation complete</DialogTitle>
                <DialogDescription>The office has been notified — here's what happened automatically.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue-600" />
                  <div>
                    <p className="font-medium text-ink-800">Invoice {installOutcome.invoiceNumber} created</p>
                    <p className="text-xs text-ink-500">Billing has been notified to follow up on payment.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-600" />
                  <div>
                    <p className="font-medium text-ink-800">Warranty active until {formatDate(installOutcome.warrantyExpiresOn)}</p>
                    <p className="text-xs text-ink-500">Tracked on the client's unit record.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 p-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan-600" />
                  <div>
                    <p className="font-medium text-ink-800">Next PMS visit scheduled for {formatDate(installOutcome.nextPmsDate)}</p>
                    <p className="text-xs text-ink-500">Added to the team calendar.</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="brand" onClick={() => setInstallOutcome(null)}>Done</Button>
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
            <DialogDescription>{activeJob?.clientName} — findings and photos go straight to the client's record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Findings</Label>
              <Textarea
                value={surveyForm.findings}
                onChange={(e) => setSurveyForm({ ...surveyForm, findings: e.target.value })}
                placeholder="Space assessment, existing setup, constraints..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recommended unit(s)</Label>
              <Input
                value={surveyForm.recommendedUnits}
                onChange={(e) => setSurveyForm({ ...surveyForm, recommendedUnits: e.target.value })}
                placeholder="e.g. 1.5HP Split Type x2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Photos</Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handlePhotoSelect(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Add Photos
              </Button>
              {surveyPhotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {surveyPhotos.map((url) => (
                    <div key={url} className="group relative">
                      <img src={url} alt="Survey upload" className="h-16 w-16 rounded-md border border-ink-100 object-cover" />
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
            <Button variant="outline" onClick={() => setSurveyOpen(false)}>Cancel</Button>
            <Button variant="brand" disabled={!surveyForm.findings} onClick={submitSurveyReport}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
