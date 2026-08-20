import { useState } from "react";
import { Download, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import { csvTextToRecords, downloadCsv, toCsv } from "@/lib/csv";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  templateHeaders: string[];
  templateSampleRow?: string[];
  templateFilename: string;
  onImport: (rows: Record<string, string>[]) => { successCount: number; errors: string[] };
}

/** Reusable "download a CSV template, then drag-drop it back in" import flow —
 * every module's import button wires into this the same way. */
export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateHeaders,
  templateSampleRow,
  templateFilename,
  onImport,
}: CsvImportDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ successCount: number; errors: string[] } | null>(null);

  function reset() {
    setFileName(null);
    setRows([]);
    setResult(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function handleFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRows(csvTextToRecords(text));
    };
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    const outcome = onImport(rows);
    setResult(outcome);
  }

  function handleDownloadTemplate() {
    const content = toCsv([templateHeaders, ...(templateSampleRow ? [templateSampleRow] : [])]);
    downloadCsv(templateFilename, content);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "Download the template, fill it in, then upload it here to import in bulk."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </Button>

          {!fileName ? (
            <FileDropZone accept=".csv,text/csv" onFilesSelected={handleFile} label="Drag & drop your filled-in CSV here, or click to browse" hint={`Expected columns: ${templateHeaders.join(", ")}`} />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-ink-400" />
                <span className="truncate">{fileName}</span>
                <span className="shrink-0 text-xs text-ink-400">({rows.length} row{rows.length === 1 ? "" : "s"})</span>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {rows.length > 0 && !result && (
            <div className="max-h-56 overflow-auto rounded-lg border border-ink-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    {templateHeaders.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {templateHeaders.map((h) => (
                        <TableCell key={h} className="text-xs text-ink-600">{row[h] ?? ""}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && <p className="p-2 text-xs text-ink-400">+ {rows.length - 10} more row(s) not shown.</p>}
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50 p-3">
              <div className="flex items-center gap-2 text-sm text-brand-green-700">
                <CheckCircle2 className="h-4 w-4" /> {result.successCount} row{result.successCount === 1 ? "" : "s"} imported.
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-brand-crimson-600">
                    <AlertTriangle className="h-4 w-4" /> {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped:
                  </div>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-ink-500">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>{result ? "Close" : "Cancel"}</Button>
          {!result && (
            <Button variant="brand" disabled={rows.length === 0} onClick={handleConfirmImport}>
              Import {rows.length > 0 ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
