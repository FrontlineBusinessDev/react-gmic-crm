import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Phone, Mail, MapPin, FileText, ArrowRight, UserCheck, Search, X, Clock, ArrowUpDown, LayoutGrid, LayoutList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { LeadStageBadge } from "@/components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCrmStore } from "@/store/crmStore";
import { SurveyPhotoGrid } from "@/components/shared/survey-photos";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Lead, LeadStage } from "@/types";
import { useNavigate, useSearchParams } from "react-router-dom";

const stages: { key: LeadStage; label: string; accent: string }[] = [
  { key: "inquiry", label: "Inquiry", accent: "border-t-ink-300" },
  { key: "survey_done", label: "Survey Done", accent: "border-t-brand-cyan-500" },
  { key: "proposal_sent", label: "Proposal Sent", accent: "border-t-amber-500" },
  { key: "won", label: "Won", accent: "border-t-brand-green-500" },
  { key: "lost", label: "Lost", accent: "border-t-brand-crimson-500" },
];

const sources: (Lead["source"] | "all")[] = ["all", "Facebook Messenger", "Referral", "Walk-in", "Website", "Phone Call"];
const stageFilters: (LeadStage | "all")[] = ["all", "inquiry", "survey_done", "proposal_sent", "won", "lost"];
const KANBAN_COLUMN_HEIGHT = "max-h-[560px]";

export default function LeadsPipeline() {
  const { leads, addLead, moveLeadStage, convertLeadToClient } = useCrmStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  // Tracks which ?lead= id we've already opened, so React StrictMode's double effect
  // invocation (or any re-render before the URL cleanup lands) can't reprocess — and
  // re-close — the same deep link.
  const consumedLeadParam = useRef<string | null>(null);

  // Deep-link support: /leads?lead=<id> (e.g. from the Dashboard's "Leads Needing Attention") opens that lead's modal directly.
  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (!leadId || consumedLeadParam.current === leadId) return;
    consumedLeadParam.current = leadId;
    const match = leads.find((l) => l.id === leadId);
    if (match) setDetailLead(match);
    setSearchParams((params) => {
      params.delete("lead");
      return params;
    }, { replace: true });
  }, [searchParams, leads, setSearchParams]);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<(typeof sources)[number]>("all");
  const [stageFilter, setStageFilter] = useState<(typeof stageFilters)[number]>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { kind: "move"; lead: Lead; toStage: LeadStage; toLabel: string }
    | { kind: "lost"; lead: Lead }
    | { kind: "convert"; lead: Lead }
    | null
  >(null);
  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    address: "",
    source: "Facebook Messenger" as Lead["source"],
    interestedUnit: "",
    estimatedValue: "",
    notes: "",
  });

  const filteredLeads = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = leads.filter((l) => {
      const matchesQuery = !q || l.clientName.toLowerCase().includes(q) || l.interestedUnit.toLowerCase().includes(q);
      const matchesSource = source === "all" || l.source === source;
      const matchesStage = stageFilter === "all" || l.stage === stageFilter;
      return matchesQuery && matchesSource && matchesStage;
    });
    return filtered.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [leads, query, source, stageFilter, sortOrder]);

  const { page, setPage, pageSize, setPageSize, pageItems, total: totalFiltered } = usePagination(filteredLeads, 10);

  const hasActiveFilters = query.trim() !== "" || source !== "all" || stageFilter !== "all" || sortOrder !== "newest";
  function clearFilters() {
    setQuery("");
    setSource("all");
    setStageFilter("all");
    setSortOrder("newest");
  }

  function handleAdd() {
    if (!form.clientName || !form.phone) return;
    addLead({
      clientName: form.clientName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      source: form.source,
      interestedUnit: form.interestedUnit,
      estimatedValue: Number(form.estimatedValue) || 0,
      stage: "inquiry",
      assignedTo: "u-sales",
      notes: form.notes,
    });
    setForm({ clientName: "", phone: "", email: "", address: "", source: "Facebook Messenger", interestedUnit: "", estimatedValue: "", notes: "" });
    setAddOpen(false);
  }

  function handleConvert(lead: Lead) {
    const newClientId = convertLeadToClient(lead.id);
    setDetailLead(null);
    if (newClientId) navigate(`/clients/${newClientId}`);
  }

  function runPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.kind === "move") {
      moveLeadStage(pendingAction.lead.id, pendingAction.toStage);
      if (detailLead?.id === pendingAction.lead.id) setDetailLead({ ...detailLead, stage: pendingAction.toStage });
    } else if (pendingAction.kind === "lost") {
      moveLeadStage(pendingAction.lead.id, "lost", "Marked lost from pipeline");
      setDetailLead(null);
    } else if (pendingAction.kind === "convert") {
      handleConvert(pendingAction.lead);
    }
    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads Pipeline"
        description="Inquiry → Survey → Proposal → Won or Lost."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="brand"><Plus className="h-4 w-4" /> New Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new lead</DialogTitle>
                <DialogDescription>Captured leads start in the Inquiry stage.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Client name</Label>
                  <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as Lead["source"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["Facebook Messenger", "Referral", "Walk-in", "Website", "Phone Call"] as const).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Est. value (₱)</Label>
                    <Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Interested unit / needs</Label>
                  <Input value={form.interestedUnit} onChange={(e) => setForm({ ...form, interestedUnit: e.target.value })} placeholder="e.g. 2HP Split Type" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleAdd}>Create Lead</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="table"><LayoutList className="h-3.5 w-3.5" /> Table</TabsTrigger>
          </TabsList>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by client or unit..." className="pl-9" />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All sources" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {view === "table" && (
              <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as typeof stageFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stageFilters.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All stages" : stages.find((st) => st.key === s)?.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
              <SelectTrigger className="w-full sm:w-44">
                <ArrowUpDown className="h-3.5 w-3.5 text-ink-400" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="kanban">
          <FilterTransition filterKey={`${query}-${source}-${sortOrder}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stages.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
              const isDropTarget = dragOverStage === stage.key && draggedLead?.stage !== stage.key;
              const canDropHere = draggedLead && draggedLead.stage !== stage.key;
              return (
                <div
                  key={stage.key}
                  className="flex flex-col gap-3"
                  onDragOver={(e) => {
                    if (!canDropHere) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverStage(stage.key);
                  }}
                  onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    if (!draggedLead || draggedLead.stage === stage.key) {
                      setDraggedLead(null);
                      return;
                    }
                    if (stage.key === "won") setPendingAction({ kind: "convert", lead: draggedLead });
                    else if (stage.key === "lost") setPendingAction({ kind: "lost", lead: draggedLead });
                    else setPendingAction({ kind: "move", lead: draggedLead, toStage: stage.key, toLabel: stage.label });
                    setDraggedLead(null);
                  }}
                >
                  <div className={`flex items-center justify-between border-t-2 ${stage.accent} pt-2`}>
                    <span className="text-sm font-semibold text-ink-800">{stage.label}</span>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{stageLeads.length}</span>
                  </div>
                  <div
                    className={`flex flex-col gap-2 overflow-y-auto rounded-lg pr-1 transition-colors ${KANBAN_COLUMN_HEIGHT} ${
                      isDropTarget ? "bg-brand-blue-500/5 ring-2 ring-inset ring-brand-blue-400" : ""
                    }`}
                  >
                    {stageLeads.map((lead, i) => {
                      const draggable = lead.stage !== "won" && lead.stage !== "lost";
                      return (
                        <motion.div
                          key={lead.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                        >
                          <Card
                            draggable={draggable}
                            onDragStart={(e) => {
                              if (!draggable) return;
                              setDraggedLead(lead);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", lead.id);
                            }}
                            onDragEnd={() => {
                              setDraggedLead(null);
                              setDragOverStage(null);
                            }}
                            className={`transition-shadow hover:shadow-md ${
                              draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                            } ${draggedLead?.id === lead.id ? "opacity-40" : ""}`}
                            onClick={() => setDetailLead(lead)}
                          >
                            <CardContent className="space-y-2 p-3.5">
                              <p className="text-sm font-medium text-ink-800">{lead.clientName}</p>
                              <p className="text-xs text-ink-500">{lead.interestedUnit || "—"}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-brand-blue-600">{formatCurrency(lead.estimatedValue)}</span>
                                <span className="text-[10px] text-ink-400">{lead.source}</span>
                              </div>
                              <div className="flex items-center gap-1 border-t border-ink-100 pt-1.5 text-[10px] text-ink-400">
                                <Clock className="h-3 w-3" /> {formatDateTime(lead.createdAt)}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div className="rounded-lg border border-dashed border-ink-100 px-3 py-6 text-center text-xs text-ink-300">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </FilterTransition>
        </TabsContent>

        <TabsContent value="table">
          {leads.length === 0 ? (
            <EmptyState icon={UserCheck} title="No leads yet" description="Add a lead to start tracking the pipeline." />
          ) : filteredLeads.length === 0 ? (
            <EmptyState icon={UserCheck} title="No leads match your filters" description="Try a different search term or clear filters." />
          ) : (
            <FilterTransition filterKey={`${query}-${source}-${stageFilter}-${sortOrder}-${page}`}>
            <Card>
              <MobileList>
                {pageItems.map((lead) => (
                  <MobileListCard key={lead.id} onClick={() => setDetailLead(lead)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink-800">{lead.clientName}</p>
                        <p className="text-xs text-ink-500">{lead.interestedUnit || "—"}</p>
                      </div>
                      <LeadStageBadge stage={lead.stage} />
                    </div>
                    <MobileListRow label="Source">{lead.source}</MobileListRow>
                    <MobileListRow label="Est. value">{formatCurrency(lead.estimatedValue)}</MobileListRow>
                    <MobileListRow label="Created">{formatDateTime(lead.createdAt)}</MobileListRow>
                    <MobileListRow label="Updated">{formatDate(lead.updatedAt)}</MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Est. Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer" onClick={() => setDetailLead(lead)}>
                        <TableCell>
                          <p className="text-sm font-medium text-ink-800">{lead.clientName}</p>
                          <p className="text-xs text-ink-500">{lead.interestedUnit || "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm text-ink-600">{lead.source}</TableCell>
                        <TableCell className="text-sm font-medium text-brand-blue-600">{formatCurrency(lead.estimatedValue)}</TableCell>
                        <TableCell><LeadStageBadge stage={lead.stage} /></TableCell>
                        <TableCell className="text-xs text-ink-500">{formatDateTime(lead.createdAt)}</TableCell>
                        <TableCell className="text-xs text-ink-500">{formatDateTime(lead.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={totalFiltered} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </Card>
            </FilterTransition>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailLead} onOpenChange={(o) => !o && setDetailLead(null)}>
        <DialogContent className="max-w-lg">
          {detailLead && (
            <>
              <DialogHeader>
                <DialogTitle>{detailLead.clientName}</DialogTitle>
                <DialogDescription>{detailLead.interestedUnit}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-ink-700"><Phone className="h-4 w-4 text-ink-400" /> {detailLead.phone}</div>
                <div className="flex items-center gap-2 text-ink-700"><Mail className="h-4 w-4 text-ink-400" /> {detailLead.email || "—"}</div>
                <div className="flex items-center gap-2 text-ink-700"><MapPin className="h-4 w-4 shrink-0 text-ink-400" /> {detailLead.address}</div>
                <div className="flex items-center gap-2 text-ink-700"><Clock className="h-4 w-4 shrink-0 text-ink-400" /> Created {formatDateTime(detailLead.createdAt)} · Updated {formatDateTime(detailLead.updatedAt)}</div>

                <div className="rounded-lg bg-ink-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Notes</p>
                  <p className="mt-1 text-ink-700">{detailLead.notes || "No notes yet."}</p>
                </div>

                {detailLead.surveyReport && (
                  <div className="rounded-lg border border-brand-cyan-500/30 bg-brand-cyan-500/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-cyan-700">
                      <FileText className="h-3.5 w-3.5" /> Survey Report
                    </p>
                    <p className="mt-1 text-ink-700">{detailLead.surveyReport.findings}</p>
                    <p className="mt-1 text-xs text-ink-500">Recommended: {detailLead.surveyReport.recommendedUnits}</p>
                    <SurveyPhotoGrid photos={detailLead.surveyReport.photos} />
                    <p className="mt-1 text-[11px] text-ink-400">Submitted {formatDate(detailLead.surveyReport.submittedAt)}</p>
                  </div>
                )}

                {detailLead.lostReason && (
                  <div className="rounded-lg bg-brand-crimson-500/5 p-3 text-brand-crimson-700">
                    <p className="text-xs font-semibold uppercase tracking-wide">Lost Reason</p>
                    <p className="mt-1">{detailLead.lostReason}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {detailLead.stage !== "won" && detailLead.stage !== "lost" && (
                  <>
                    {stages
                      .filter((s) => s.key !== detailLead.stage && s.key !== "lost" && s.key !== "won")
                      .map((s) => (
                        <Button
                          key={s.key}
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingAction({ kind: "move", lead: detailLead, toStage: s.key, toLabel: s.label })}
                        >
                          Move to {s.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ))}
                    <Button variant="destructive" size="sm" onClick={() => setPendingAction({ kind: "lost", lead: detailLead })}>
                      Mark Lost
                    </Button>
                    <Button variant="brand" size="sm" onClick={() => setPendingAction({ kind: "convert", lead: detailLead })}>
                      <UserCheck className="h-3.5 w-3.5" /> Mark Won & Convert
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent className="max-w-sm">
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {pendingAction.kind === "move" && `Move ${pendingAction.lead.clientName}?`}
                  {pendingAction.kind === "lost" && `Mark ${pendingAction.lead.clientName} as lost?`}
                  {pendingAction.kind === "convert" && `Mark ${pendingAction.lead.clientName} as won?`}
                </DialogTitle>
                <DialogDescription>
                  {pendingAction.kind === "move" &&
                    `This will move the lead from "${stages.find((s) => s.key === pendingAction.lead.stage)?.label}" to "${pendingAction.toLabel}".`}
                  {pendingAction.kind === "lost" && "This lead will be marked as lost and removed from active follow-up."}
                  {pendingAction.kind === "convert" && "This will convert the lead into a client record and open their client profile."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
                <Button
                  variant={pendingAction.kind === "lost" ? "destructive" : "brand"}
                  onClick={runPendingAction}
                >
                  {pendingAction.kind === "move" && "Move Lead"}
                  {pendingAction.kind === "lost" && "Mark Lost"}
                  {pendingAction.kind === "convert" && "Confirm & Convert"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
