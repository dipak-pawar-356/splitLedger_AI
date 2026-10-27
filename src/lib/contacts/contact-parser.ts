// Dynamic import of xlsx ensures optimal client-side code splitting and avoids bundling SheetJS on initial page load
async function getXlsx() {
  return await import("xlsx");
}

export interface AnalyzedFileSummary {
  fileName: string;
  fileSize: number;
  fileType: "xlsx" | "csv" | "vcf" | "google" | "outlook";
  totalRows: number;
  validRowsCount: number;
  duplicateRowsCount: number;
  invalidEmailCount: number;
  invalidPhoneCount: number;
  missingNameCount: number;
  formulaInjectionsFound: number;
  detectedHeaders: string[];
  suggestedMapping: Record<string, string>; // applicationField -> spreadsheetHeader
  sampleRows: Array<Record<string, any>>;
}

export const SYSTEM_FIELDS = [
  { key: "name", label: "Full Name", required: true },
  { key: "firstName", label: "First Name", required: false },
  { key: "lastName", label: "Last Name", required: false },
  { key: "email", label: "Email Address", required: false },
  { key: "phone", label: "Phone / Mobile", required: false },
  { key: "company", label: "Company / Organization", required: false },
  { key: "address", label: "Address / Location", required: false },
  { key: "tags", label: "Tags / Labels (comma-separated)", required: false },
  { key: "notes", label: "Notes / Memo", required: false },
  { key: "openingBalance", label: "Opening Balance (₹)", required: false },
] as const;

/**
 * Intelligent header matcher
 */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map((h) => ({ original: h, lower: h.toLowerCase().trim() }));

  const patterns: Record<string, RegExp[]> = {
    name: [/^name$/i, /^full\s*name$/i, /^contact\s*name$/i, /^display\s*name$/i],
    firstName: [/^first\s*name$/i, /^firstname$/i, /^given\s*name$/i, /^first$/i],
    lastName: [/^last\s*name$/i, /^lastname$/i, /^surname$/i, /^family\s*name$/i, /^last$/i],
    email: [/email/i, /e-mail/i, /mail/i],
    phone: [/phone/i, /mobile/i, /cell/i, /tel/i, /contact\s*no/i],
    company: [/company/i, /organization/i, /organisation/i, /employer/i, /business/i],
    address: [/address/i, /street/i, /city/i, /location/i],
    tags: [/tags/i, /tag/i, /labels/i, /categories/i, /group/i],
    notes: [/notes/i, /note/i, /comments/i, /description/i, /memo/i],
    openingBalance: [/opening\s*balance/i, /^balance$/i],
  };

  for (const [fieldKey, regexes] of Object.entries(patterns)) {
    for (const { original, lower } of lowerHeaders) {
      if (regexes.some((r) => r.test(lower))) {
        mapping[fieldKey] = original;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parse vCard (.vcf) format
 */
export function parseVCardContent(vcfString: string): Array<Record<string, any>> {
  const contacts: Array<Record<string, any>> = [];
  const cards = vcfString.split(/BEGIN:VCARD/i).filter((c) => c.trim().length > 0);

  for (const card of cards) {
    const record: Record<string, any> = {};
    const lines = card.split(/\r\n|\r|\n/);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Handle folded lines (continuation)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
        i++;
        line += lines[i].trim();
      }

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const meta = line.slice(0, colonIdx).toUpperCase();
      const val = line.slice(colonIdx + 1).trim();

      if (meta.startsWith("FN") || meta === "NAME") {
        record["Full Name"] = val;
      } else if (meta.startsWith("N") && !record["Full Name"]) {
        const parts = val.split(";").map((p) => p.trim()).filter(Boolean);
        record["Full Name"] = parts.reverse().join(" ");
      } else if (meta.startsWith("EMAIL")) {
        record["Email"] = val;
      } else if (meta.startsWith("TEL")) {
        record["Phone"] = val;
      } else if (meta.startsWith("ORG")) {
        record["Company"] = val.replace(/;/g, " ");
      } else if (meta.startsWith("ADR")) {
        record["Address"] = val.replace(/;/g, " ").trim();
      } else if (meta.startsWith("NOTE")) {
        record["Notes"] = val;
      } else if (meta.startsWith("CATEGORIES")) {
        record["Tags"] = val;
      }
    }

    if (record["Full Name"] || record["Email"] || record["Phone"]) {
      contacts.push(record);
    }
  }

  return contacts;
}

/**
 * Comprehensive File Analyzer for Excel, CSV, Google, Outlook, vCard
 */
export async function analyzeContactFile(file: File): Promise<AnalyzedFileSummary> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  let fileType: "xlsx" | "csv" | "vcf" | "google" | "outlook" = "csv";
  if (ext === "xlsx" || ext === "xls") {
    fileType = "xlsx";
  } else if (ext === "vcf") {
    fileType = "vcf";
  } else if (fileName.toLowerCase().includes("google")) {
    fileType = "google";
  } else if (fileName.toLowerCase().includes("outlook")) {
    fileType = "outlook";
  }

  let rawData: Array<Record<string, any>> = [];
  let headers: string[] = [];

  if (fileType === "vcf") {
    const text = await file.text();
    rawData = parseVCardContent(text);
    headers = Array.from(new Set(rawData.flatMap((r) => Object.keys(r))));
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await getXlsx();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    if (rawData.length > 0) {
      headers = Object.keys(rawData[0]);
    }
  }

  const suggestedMapping = autoDetectMapping(headers);

  // Analyze quality and potential errors
  let missingNameCount = 0;
  let invalidEmailCount = 0;
  let invalidPhoneCount = 0;
  let formulaInjectionsFound = 0;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  let duplicateRowsCount = 0;

  const nameCol = suggestedMapping.name || suggestedMapping.firstName;
  const emailCol = suggestedMapping.email;
  const phoneCol = suggestedMapping.phone;

  for (const row of rawData) {
    const nameVal = nameCol ? String(row[nameCol] || "").trim() : "";
    if (!nameVal) {
      missingNameCount++;
    }

    const emailVal = emailCol ? String(row[emailCol] || "").trim() : "";
    if (emailVal) {
      if (!emailRegex.test(emailVal)) {
        invalidEmailCount++;
      } else {
        const norm = emailVal.toLowerCase();
        if (seenEmails.has(norm)) {
          duplicateRowsCount++;
        } else {
          seenEmails.add(norm);
        }
      }
    }

    const phoneVal = phoneCol ? String(row[phoneCol] || "").trim() : "";
    if (phoneVal) {
      const cleanDigits = phoneVal.replace(/[^0-9]/g, "");
      if (cleanDigits.length < 6) {
        invalidPhoneCount++;
      } else {
        const normPhone = cleanDigits.slice(-10);
        if (seenPhones.has(normPhone)) {
          duplicateRowsCount++;
        } else {
          seenPhones.add(normPhone);
        }
      }
    }

    // Formula injection check
    for (const val of Object.values(row)) {
      if (typeof val === "string" && /^[=+\-@\t\r]/.test(val.trim())) {
        formulaInjectionsFound++;
      }
    }
  }

  const totalRows = rawData.length;
  const validRowsCount = Math.max(0, totalRows - missingNameCount);

  return {
    fileName,
    fileSize,
    fileType,
    totalRows,
    validRowsCount,
    duplicateRowsCount,
    invalidEmailCount,
    invalidPhoneCount,
    missingNameCount,
    formulaInjectionsFound,
    detectedHeaders: headers,
    suggestedMapping,
    sampleRows: rawData.slice(0, 10),
  };
}

/**
 * Generate standard CSV template for downloading
 */
export function generateContactCsvTemplate(): string {
  const headers = [
    "Full Name",
    "Email Address",
    "Phone Number",
    "Company",
    "Address",
    "Tags",
    "Notes",
    "Opening Balance",
  ];

  const sampleRows = [
    [
      "Aarav Sharma",
      "aarav.sharma@example.com",
      "+91 98765 43210",
      "Acme Innovations",
      "Bandra West, Mumbai",
      "Trip, Roommate, Finance",
      "Met at Goa summit",
      "0",
    ],
    [
      "Priya Patel",
      "priya.patel@example.com",
      "+91 91234 56789",
      "Starlight Media",
      "Koramangala, Bengaluru",
      "Office, Colleague",
      "Team lunch organiser",
      "500",
    ],
  ];

  const csvRows = [headers.join(",")];
  for (const r of sampleRows) {
    csvRows.push(r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
  }

  return csvRows.join("\r\n");
}

/**
 * Generate standard Excel template (.xlsx) for downloading
 */
export async function generateContactXlsxTemplateBlob(): Promise<Blob> {
  const XLSX = await getXlsx();
  const wsData = [
    [
      "Full Name",
      "Email Address",
      "Phone Number",
      "Company",
      "Address",
      "Tags",
      "Notes",
      "Opening Balance",
    ],
    [
      "Aarav Sharma",
      "aarav.sharma@example.com",
      "+91 98765 43210",
      "Acme Innovations",
      "Bandra West, Mumbai",
      "Trip, Roommate, Finance",
      "Met at Goa summit",
      0,
    ],
    [
      "Priya Patel",
      "priya.patel@example.com",
      "+91 91234 56789",
      "Starlight Media",
      "Koramangala, Bengaluru",
      "Office, Colleague",
      "Team lunch organiser",
      500,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Set columns width
  ws["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 25 },
    { wch: 25 },
    { wch: 30 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts Template");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generate vCard template (.vcf)
 */
export function generateContactVcfTemplate(): string {
  return `BEGIN:VCARD
VERSION:3.0
FN:Aarav Sharma
EMAIL:aarav.sharma@example.com
TEL:+919876543210
ORG:Acme Innovations
ADR:;;Bandra West;Mumbai;;;India
CATEGORIES:Trip,Roommate
NOTE:Met at Goa summit
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Priya Patel
EMAIL:priya.patel@example.com
TEL:+919123456789
ORG:Starlight Media
ADR:;;Koramangala;Bengaluru;;;India
CATEGORIES:Office,Colleague
NOTE:Team lunch organiser
END:VCARD`;
}

/**
 * Client Export Contacts to CSV with Formula Injection Protection
 */
export function exportContactsToCsv(contacts: any[]): string {
  const headers = [
    "Name",
    "Public ID",
    "Email",
    "Phone",
    "Company",
    "Address",
    "Tags",
    "Net Balance (₹)",
    "Currency",
    "Status",
    "Created Date",
  ];

  const rows = [headers.join(",")];

  for (const c of contacts) {
    const sanitize = (val: any) => {
      if (val === null || val === undefined) return "";
      let s = String(val).trim();
      // Formula Injection mitigation: prefix with single quote if formula starter
      if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`;
      }
      return `"${s.replace(/"/g, '""')}"`;
    };

    const tagsStr = Array.isArray(c.tags) ? c.tags.join("; ") : "";
    const balanceRupees = (Number(c.balance) || 0) / 100;
    const status = c.isArchived ? "Archived" : "Active";

    rows.push(
      [
        sanitize(c.name),
        sanitize(c.publicId),
        sanitize(c.email),
        sanitize(c.phone),
        sanitize(c.company),
        sanitize(c.address),
        sanitize(tagsStr),
        sanitize(balanceRupees.toFixed(2)),
        sanitize(c.currency || "INR"),
        sanitize(status),
        sanitize(c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""),
      ].join(",")
    );
  }

  return rows.join("\r\n");
}

/**
 * Client Export Contacts to vCard (.vcf)
 */
export function exportContactsToVcf(contacts: any[]): string {
  const cards: string[] = [];

  for (const c of contacts) {
    const tags = Array.isArray(c.tags) ? c.tags.join(",") : "";
    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${c.name || "Contact"}`,
      c.email ? `EMAIL:${c.email}` : "",
      c.phone ? `TEL:${c.phone}` : "",
      c.company ? `ORG:${c.company}` : "",
      c.address ? `ADR:;;${c.address};;;;` : "",
      tags ? `CATEGORIES:${tags}` : "",
      c.notes ? `NOTE:${c.notes.replace(/\n/g, "\\n")}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");

    cards.push(card);
  }

  return cards.join("\r\n");
}

/**
 * Client Export Contacts to XLSX Blob
 */
export async function exportContactsToXlsxBlob(contacts: any[]): Promise<Blob> {
  const XLSX = await getXlsx();
  const aoaData: any[][] = [
    [
      "Name",
      "Public ID",
      "Email",
      "Phone",
      "Company",
      "Address",
      "Tags",
      "Net Balance (₹)",
      "Currency",
      "Status",
      "Created Date",
    ],
  ];

  for (const c of contacts) {
    const tagsStr = Array.isArray(c.tags) ? c.tags.join(", ") : "";
    const balanceRupees = (Number(c.balance) || 0) / 100;
    const status = c.isArchived ? "Archived" : "Active";

    aoaData.push([
      c.name,
      c.publicId,
      c.email || "",
      c.phone || "",
      c.company || "",
      c.address || "",
      tagsStr,
      balanceRupees,
      c.currency || "INR",
      status,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoaData);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
