import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import type { AuditAction, AuditLogEntry } from "@/types";

const actionVariant: Record<AuditAction, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  create: "success",
  update: "info",
  archive: "warning",
  restore: "secondary",
  delete: "destructive",
};

const actionLabel: Record<AuditAction, string> = {
  create: "Created",
  update: "Updated",
  archive: "Archived",
  restore: "Restored",
  delete: "Deleted",
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatValue(v: string | number | null) {
  if (v === null || v === "") return "—";
  return String(v);
}

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No audit history yet"
        description="Changes made to records in this module will show up here."
      />
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Changes</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-sm text-ink-500">{formatTimestamp(entry.timestamp)}</TableCell>
              <TableCell className="font-medium text-ink-800">{entry.entityLabel}</TableCell>
              <TableCell>
                <Badge variant={actionVariant[entry.action]}>{actionLabel[entry.action]}</Badge>
              </TableCell>
              <TableCell>
                {entry.changes.length === 0 ? (
                  <span className="text-sm text-ink-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.changes.map((c, i) => (
                      <span
                        key={i}
                        className="whitespace-nowrap rounded-md bg-ink-50 px-2 py-0.5 text-xs text-ink-600"
                      >
                        <span className="font-medium text-ink-700">{c.field}</span>: {formatValue(c.oldValue)} → {formatValue(c.newValue)}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-ink-600">{entry.actor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
