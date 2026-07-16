export type SavedExportCsvRow = {
  name: string;
  role?: string;
  currentCompany?: string;
  location?: string;
  experience?: string;
  finalScore?: number | null;
  email?: string;
  phone?: string;
  linkedin_profile_url?: string;
};

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadSavedCandidatesCsv(
  rows: SavedExportCsvRow[],
  filename = "saved_candidates.csv"
) {
  const headers = [
    "Name",
    "Role",
    "Company",
    "Location",
    "Experience",
    "Score",
    "Email",
    "Phone",
    "LinkedIn",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name || "",
        row.role || "",
        row.currentCompany || "",
        row.location || "",
        row.experience || "",
        typeof row.finalScore === "number" ? `${row.finalScore}/5` : "",
        row.email || "",
        row.phone || "",
        row.linkedin_profile_url || "",
      ]
        .map((cell) => escapeCsv(String(cell ?? "")))
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[^\w.-]+/g, "_") || "saved_candidates.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
