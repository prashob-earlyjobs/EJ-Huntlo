import * as XLSX from "xlsx";

import type { ReportMetricCandidate } from "@/lib/campaignEmailReport";

function sanitizeFilenamePart(value: string) {
  return (
    String(value || "export")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 48) || "export"
  );
}

function formatExportDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function downloadReportCandidatesExcel({
  candidates,
  metricLabel,
  campaignName,
}: {
  candidates: ReportMetricCandidate[];
  metricLabel: string;
  campaignName: string;
}) {
  const rows = candidates.map((c) => ({
    Name: c.name,
    Role: c.role || "",
    Company: c.company || "",
    Email: c.email || "",
    Phone: c.phone || "",
    Status: c.detail || "",
    "Reply disposition": c.replyDisposition || "",
    "Messages sent": c.sentCount ?? 0,
    "Has reply": c.hasReply ? "Yes" : "No",
    "Last sent": formatExportDate(c.lastSentAt),
    "Last reply": formatExportDate(c.lastReplyAt),
    "Candidate key": c.candidateKey || "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Candidates");

  const fileName = `${sanitizeFilenamePart(campaignName)}_${sanitizeFilenamePart(metricLabel)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
