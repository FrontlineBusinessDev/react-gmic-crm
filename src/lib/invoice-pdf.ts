import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

export function exportInvoicePdf(inv: Invoice) {
  const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const balance = total - inv.amountPaid;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GMIC CARES+", marginX, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  y += 20;
  doc.text("Invoice", marginX, y);

  doc.setFontSize(10);
  doc.text(inv.invoiceNumber, 545, 56, { align: "right" });
  doc.text(`Issued: ${formatDate(inv.issueDate)}`, 545, 72, { align: "right" });
  doc.text(`Due: ${formatDate(inv.dueDate)}`, 545, 86, { align: "right" });

  y += 30;
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", marginX, y);
  doc.setFont("helvetica", "normal");
  y += 16;
  doc.text(inv.clientName, marginX, y);

  y += 30;
  doc.setFont("helvetica", "bold");
  doc.text("Description", marginX, y);
  doc.text("Qty", 340, y, { align: "right" });
  doc.text("Unit Price", 430, y, { align: "right" });
  doc.text("Amount", 545, y, { align: "right" });
  doc.setLineWidth(0.5);
  doc.line(marginX, y + 6, 545, y + 6);
  doc.setFont("helvetica", "normal");

  for (const item of inv.items) {
    y += 22;
    doc.text(item.description, marginX, y);
    doc.text(String(item.qty), 340, y, { align: "right" });
    doc.text(formatCurrency(item.unitPrice), 430, y, { align: "right" });
    doc.text(formatCurrency(item.qty * item.unitPrice), 545, y, { align: "right" });
  }

  y += 16;
  doc.line(marginX, y, 545, y);
  y += 24;
  doc.text("Total", 430, y, { align: "right" });
  doc.text(formatCurrency(total), 545, y, { align: "right" });
  y += 18;
  doc.text("Paid", 430, y, { align: "right" });
  doc.text(formatCurrency(inv.amountPaid), 545, y, { align: "right" });
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Balance due", 430, y, { align: "right" });
  doc.text(formatCurrency(balance), 545, y, { align: "right" });

  y += 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Status: ${inv.status[0].toUpperCase()}${inv.status.slice(1)}`, marginX, y);

  doc.save(`${inv.invoiceNumber}.pdf`);
}
