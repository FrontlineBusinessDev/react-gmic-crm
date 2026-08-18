import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Target, Wallet, Boxes, ArrowRight, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadStageBadge } from "@/components/shared/status-badge";
import { useCrmStore } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatDateTime, initials } from "@/lib/utils";
import { mockUsers } from "@/data/users";

export default function Dashboard() {
  const { clients, leads, invoices, schedule, activity } = useCrmStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  const stats = useMemo(() => {
    const totalOutstanding = clients.reduce((sum, c) => sum + c.balance, 0);
    const activeLeads = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
    const totalUnits = clients.reduce((sum, c) => sum + c.units.length, 0);
    const wonValue = leads.filter((l) => l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0);
    return { totalOutstanding, activeLeads, totalUnits, wonValue };
  }, [clients, leads]);

  const pipelineData = useMemo(() => {
    const stages: { key: string; label: string }[] = [
      { key: "inquiry", label: "Inquiry" },
      { key: "survey_done", label: "Survey" },
      { key: "proposal_sent", label: "Proposal" },
      { key: "won", label: "Won" },
      { key: "lost", label: "Lost" },
    ];
    return stages.map((s) => ({
      name: s.label,
      value: leads.filter((l) => l.stage === s.key).length,
    }));
  }, [leads]);

  const upcomingJobs = schedule
    .filter((j) => j.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const overdueInvoices = invoices.filter((i) => i.status === "overdue" || i.status === "unpaid");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${currentUser?.name.split(" ")[0]}`}
        description="Here's what's happening across GMIC CARES+ today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Clients" value={String(clients.filter((c) => c.status === "active").length)} icon={Users} accent="blue" delay={0} />
        <StatCard label="Active Leads" value={String(stats.activeLeads)} icon={Target} accent="cyan" trend={`₱${(stats.wonValue / 1000).toFixed(0)}k won this period`} trendDirection="up" delay={0.05} />
        <StatCard label="Outstanding Balance" value={formatCurrency(stats.totalOutstanding)} icon={Wallet} accent="crimson" trend={`${overdueInvoices.length} invoices need follow-up`} trendDirection="down" delay={0.1} />
        <StatCard label="Units Under Management" value={String(stats.totalUnits)} icon={Boxes} accent="green" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads Pipeline Overview</CardTitle>
            <CardDescription>Distribution of leads across each stage</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-ink-500)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-ink-500)" allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-ink-50)" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--color-ink-100)", fontSize: 12 }}
                />
                <Bar dataKey="value" fill="var(--color-brand-blue-500)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
            <CardDescription>Next scheduled field visits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingJobs.map((job) => {
              const tech = mockUsers.find((u) => u.id === job.technicianId);
              return (
                <div key={job.id} className="flex items-start gap-3 rounded-lg border border-ink-100 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{job.title}</p>
                    <p className="text-xs text-ink-500">
                      {job.date} · {job.time} · {tech?.name}
                    </p>
                  </div>
                </div>
              );
            })}
            <Link
              to="/schedule"
              className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-brand-blue-600 hover:underline"
            >
              View full schedule <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across the team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.slice(0, 6).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="flex items-start gap-3"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-ink-700 text-[10px]">{initials(item.actor)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-ink-800">{item.message}</p>
                  <p className="text-xs text-ink-400">{formatDateTime(item.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Leads Needing Attention</CardTitle>
              <CardDescription>Active pipeline items sorted by most recent update</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {leads
                .filter((l) => l.stage !== "won" && l.stage !== "lost")
                .slice(0, 4)
                .map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-ink-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-800">{lead.clientName}</p>
                      <p className="text-xs text-ink-500">{lead.interestedUnit} · {formatCurrency(lead.estimatedValue)}</p>
                    </div>
                    <LeadStageBadge stage={lead.stage} />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
