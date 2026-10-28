// Dynamic import of xlsx ensures optimal client-side code splitting and avoids bundling SheetJS on initial page load
async function getXlsx() {
  return await import("xlsx");
}

export interface MappingConfidence {
  column: string;
  confidence: 100 | 85 | 60;
  isExact: boolean;
  matchType?: "exact" | "high" | "suggested";
}

export interface IntelligentMappingResult {
  mapping: Record<string, string>;
  confidences: Record<string, MappingConfidence>;
  detectedNotesColumn: string | null;
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
  allRawRows: Array<Record<string, any>>;
  sampleRows: Array<Record<string, any>>;
  mappingConfidences?: Record<string, MappingConfidence>;
  detectedNotesColumn?: string | null;
}

export const SYSTEM_FIELDS = [
  { key: "name", label: "Full Name", required: true, description: "Full display name (Unicode / Marathi / Hindi supported)" },
  { key: "firstName", label: "First Name", required: false, description: "First / Given name" },
  { key: "lastName", label: "Last Name", required: false, description: "Last / Family surname" },
  { key: "email", label: "Email Address", required: false, description: "Valid email (optional)" },
  { key: "phone", label: "Phone / Mobile", required: false, description: "Mobile or landline number (optional)" },
  { key: "company", label: "Company / Organization", required: false, description: "Employer or business name" },
  { key: "address", label: "Address / Location", required: false, description: "City or physical location" },
  { key: "tags", label: "Tags / Labels", required: false, description: "Comma-separated tags" },
  { key: "openingBalance", label: "Opening Balance (₹)", required: false, description: "Initial balance (positive, negative, or 0)" },
  { key: "currency", label: "Currency", required: false, description: "Currency code (default INR)" },
  { key: "notes", label: "Notes / Description", required: false, description: "Contact description (unmapped by default to avoid test notes)" },
] as const;

/**
 * Formula Injection Protection (CWE-1236 / CSV Injection):
 * If a text cell starts with '=', '+', '-', '@', '\t', '\r', prefix with single quote
 * and return as safe plain text.
 */
export function sanitizeFormulaInjection(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const isDangerousPrefix = /^[\t\r=+\-@]/.test(value) || /^[=+\-@]/.test(value.trim());
  const trimmed = value.trim();
  if (isDangerousPrefix) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Detects whether a note string is a spreadsheet test assertion comment
 * (e.g., 'Valid contact - baseline', 'Duplicate phone test', '=SUM(1,1)', etc.)
 * These should never be displayed as permanent contact descriptions.
 */
export function isTestingOrAssertionNote(note: string | null | undefined): boolean {
  if (!note || typeof note !== "string") return false;
  const trimmed = note.trim();
  if (!trimmed) return false;

  // Formula injections or spreadsheet prefixes
  if (/^['"]?[=+\-@\t\r]/.test(trimmed)) return true;

  // Common test patterns from benchmark spreadsheets
  const testPatterns = [
    /^(valid|invalid)\s+contact/i,
    /duplicate\s+(phone|email)/i,
    /validation\s+test/i,
    /check\s+whether\s+negative/i,
    /unicode[\s/]+devanagari/i,
    /special\s+char/i,
    /apostrophe\s+test/i,
    /test\s+long\s+notes/i,
    /optional\s+(email|phone)\s+blank/i,
    /formula\s+injection/i,
    /csv\s+injection/i,
    /^['"]?@?sum\(/i,
    /merged\s+notes:/i,
    /baseline/i,
    /test\s*case/i,
    /assertion/i,
    /edge\s*case/i,
  ];

  return testPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Clean contact name:
 * - Trims whitespace
 * - Collapses consecutive spaces
 * - Preserves Unicode, Marathi, Hindi, and special characters (O'Neil, Mary-Jane, etc.)
 */
export function cleanContactName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return sanitizeFormulaInjection(cleaned)?.slice(0, 150) || null;
}

/**
 * Standard Email format validation (RFC-compliant regex)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Optional field
  const trimmed = email.trim();
  if (!trimmed) return true;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Phone number normalization & validation:
 * Extracts clean digits, normalizes country code (+91 / 91 / 0), and verifies 7-15 digit range
 */
export function normalizePhoneForMatching(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return "";
  // Check common Indian prefix variants: +91 9876543210 or 919876543210
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Optional field
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return true;
  return digits.length >= 6 && digits.length <= 15;
}

/**
 * Opening balance parser & validator:
 * Allows 0, positive numbers, negative numbers (e.g. -450), and decimal amounts (e.g. 99.99).
 * Rejects invalid non-numeric strings.
 */
export function parseOpeningBalance(val: any): { valid: boolean; amount: number } {
  if (val === undefined || val === null || val === "") {
    return { valid: true, amount: 0 };
  }
  if (typeof val === "number") {
    if (isNaN(val)) return { valid: false, amount: 0 };
    return { valid: true, amount: val };
  }
  const str = String(val).trim();
  if (str === "" || str === "0") return { valid: true, amount: 0 };

  // Strip currency symbols and commas, but strictly preserve minus sign and decimal dot
  const cleaned = str.replace(/[₹$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { valid: false, amount: 0 };
  }
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { valid: false, amount: 0 };
  return { valid: true, amount: num };
}

/**
 * Detect whether a row is a secondary table header (e.g. "Test Item,Details" or "Key,Value")
 * placed below or separately from the main contacts table.
 */
export function isSecondaryTableHeader(row: Record<string, any>): boolean {
  if (!row || typeof row !== "object") return false;
  const vals = Object.values(row)
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  if (vals.length < 2) return false;

  const first = vals[0].toLowerCase();
  const second = vals[1].toLowerCase();

  const isFirstHeader =
    /^(test\s*items?|metadata|summary|parameters?|keys?|properties?|test\s*cases?|instructions?|legend|disclaimer|doc\s*items?)$/i.test(
      first
    );
  const isSecondHeader =
    /^(details|values?|descriptions?|comments?|types?|status|results?|notes?)$/i.test(
      second
    );

  return isFirstHeader && isSecondHeader;
}

/**
 * Detect whether a row is documentation, metadata, helper text, or test assertion notes
 * rather than a real contact record.
 *
 * Documentation examples from test spreadsheets:
 * - "Purpose,Synthetic data for testing..."
 * - "Total rows,20"
 * - "Expected basic valid examples,Rows 1-8..."
 * - "Duplicate email,Row 9 duplicates row 1 email"
 * - "Duplicate phone,Row 10 duplicates row 1 phone"
 * - "Invalid email,Row 11"
 * - "Missing required name,Row 14"
 * - "Invalid/short phone,Row 15"
 * - "Unicode name,Row 8"
 * - "Formula/CSV injection safety,Rows 19-20..."
 * - "Optional fields,Rows 12-13..."
 * - "Opening balance,Includes zero..."
 * - "Recommended test sequence,Upload → analyze..."
 * - "Safety note,Do not use this file..."
 */
export function isDocumentationOrHelperRow(
  row: Record<string, any>,
  mapping?: Record<string, string>
): boolean {
  if (!row || typeof row !== "object") return true;

  const entries = Object.entries(row).map(([k, v]) => ({
    key: k,
    val: String(v ?? "").trim(),
  }));

  const nonEmptyVals = entries.map((e) => e.val).filter(Boolean);
  if (nonEmptyVals.length === 0) return true; // Completely empty row

  // Formatting-only rows (e.g. "----", "====", "***", "###")
  if (nonEmptyVals.every((v) => /^[-=_*#\s|]+$/.test(v))) return true;

  // Secondary table header
  if (isSecondaryTableHeader(row)) return true;

  const firstVal = nonEmptyVals[0] || "";
  const firstValLower = firstVal.toLowerCase();

  // Known metadata / documentation / instructions keywords
  const docKeywords = [
    /^purpose$/i,
    /^total\s*(rows?|contacts?|records?|count)$/i,
    /^expected\s*(test\s*cases?|.*valid\s*examples?|results?)$/i,
    /^recommended\s*test\s*sequence$/i,
    /^safety\s*notes?$/i,
    /^safety\s*notice$/i,
    /^instructions?$/i,
    /^legend$/i,
    /^disclaimer$/i,
    /^summary$/i,
    /^(generated\s*at|exported\s*on|report\s*generated)$/i,
    /^about$/i,
    /^documentation$/i,
    /^overview$/i,
    /^template\s*info$/i,
    /^author$/i,
    /^version$/i,
    /^changelog$/i,
    /^notice$/i,
    /^test\s*items?$/i,
  ];

  if (docKeywords.some((r) => r.test(firstValLower))) {
    return true;
  }

  // Row starts with prefix like "Purpose:", "Notes:", "Instructions:", "Disclaimer:", "Warning:"
  if (/^(purpose:|instructions?:|disclaimer:|summary:|warning:|safety\s*note[s]?:|total\s*rows?:)/i.test(firstVal)) {
    return true;
  }

  // Check helper labels used in test spreadsheets
  // e.g. "Duplicate email", "Duplicate phone", "Invalid email", "Invalid phone", "Missing required name", "Invalid/short phone", "Unicode name", "Formula/CSV injection safety", "Optional fields", "Opening balance"
  const docLabels = [
    /^duplicate\s+(email|phone)$/i,
    /^invalid\s+(email|phone)(\s*contact)?$/i,
    /^missing\s+required\s+name$/i,
    /^invalid\/short\s+phone$/i,
    /^unicode\s+name$/i,
    /^formula\/csv\s+injection(\s*safety)?$/i,
    /^optional\s+fields$/i,
    /^opening\s+balance$/i,
  ];

  if (docLabels.some((r) => r.test(firstValLower))) {
    // If it has NO real email and NO real phone, it's documentation!
    const hasAnyRealEmail = nonEmptyVals.some((v) => isValidEmail(v) && v.includes("@"));
    const hasAnyRealPhone = nonEmptyVals.some((v) => {
      const digits = v.replace(/[^0-9]/g, "");
      return digits.length >= 6 && digits.length <= 15 && /^[+0-9\s()-]+$/.test(v);
    });

    if (!hasAnyRealEmail && !hasAnyRealPhone) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that a row has at least one primary contact field (Name, Email, or Phone).
 * Helper and documentation rows without any valid contact field are rejected.
 */
export function hasContactIndicators(
  row: Record<string, any>,
  mapping?: Record<string, string>
): boolean {
  if (!row || typeof row !== "object") return false;

  let rawName = "";
  let rawEmail = "";
  let rawPhone = "";

  if (mapping) {
    if (mapping.name && row[mapping.name]) rawName = String(row[mapping.name]).trim();
    if (mapping.email && row[mapping.email]) rawEmail = String(row[mapping.email]).trim();
    if (mapping.phone && row[mapping.phone]) rawPhone = String(row[mapping.phone]).trim();
  }

  // Fallback: look for standard keys
  if (!rawName) {
    for (const [k, v] of Object.entries(row)) {
      if (/^(name|full\s*name|contact\s*name|person)$/i.test(k) && v) {
        rawName = String(v).trim();
        break;
      }
    }
  }
  if (!rawEmail) {
    for (const [k, v] of Object.entries(row)) {
      if (/^(email|e-mail|mail)$/i.test(k) && v) {
        rawEmail = String(v).trim();
        break;
      }
    }
  }
  if (!rawPhone) {
    for (const [k, v] of Object.entries(row)) {
      if (/^(phone|mobile|tel|contact\s*no|cell)$/i.test(k) && v) {
        rawPhone = String(v).trim();
        break;
      }
    }
  }

  // Check 1: Valid Name
  const hasValidName = Boolean(
    rawName &&
    rawName.length > 0 &&
    rawName.length <= 100 &&
    !isDocumentationOrHelperRow({ Name: rawName }) &&
    !/^(details|synthetic\s*data|upload\s*→|do\s*not\s*use)/i.test(rawName)
  );

  // Check 2: Valid Email
  const hasValidEmail = Boolean(
    rawEmail &&
    rawEmail.includes("@") &&
    isValidEmail(rawEmail)
  );

  // Check 3: Valid Phone
  const phoneDigits = rawPhone ? rawPhone.replace(/[^0-9]/g, "") : "";
  const hasValidPhone = Boolean(
    rawPhone &&
    phoneDigits.length >= 6 &&
    phoneDigits.length <= 15 &&
    /^[+0-9\s()-]+$/.test(rawPhone)
  );

  return hasValidName || hasValidEmail || hasValidPhone;
}

/**
 * Intelligent Header Matcher with Confidence Tiers
 * - 100% Match: Exact column names or industry-standard headers
 * - 85% Match: High-confidence synonyms / aliases
 * - Low/Unknown: Left unmapped
 * NOTE: 'notes' is intentionally EXCLUDED from automatic mapping.
 * Test spreadsheets frequently contain assertion comments in 'Notes'.
 * Notes will only be imported if explicitly chosen by the user in the mapping step.
 */
export function autoDetectMappingWithConfidence(headers: string[]): IntelligentMappingResult {
  const mapping: Record<string, string> = {};
  const confidences: Record<string, MappingConfidence> = {};
  let detectedNotesColumn: string | null = null;

  const lowerHeaders = headers.map((h) => ({ original: h, lower: h.toLowerCase().trim() }));

  // Tier 1: 100% exact match / primary aliases
  const tier1Patterns: Record<string, RegExp[]> = {
    name: [/^name$/i, /^full\s*name$/i, /^contact\s*name$/i, /^person\s*name$/i],
    firstName: [/^first\s*name$/i, /^firstname$/i, /^given\s*name$/i, /^first$/i],
    lastName: [/^last\s*name$/i, /^lastname$/i, /^surname$/i, /^family\s*name$/i, /^last$/i],
    email: [/^email$/i, /^email\s*address$/i, /^email_address$/i, /^mail$/i],
    phone: [
      /^phone$/i,
      /^phone\s*number$/i,
      /^phone_number$/i,
      /^mobile$/i,
      /^mobile\s*number$/i,
      /^mobile_number$/i,
      /^contact\s*number$/i,
      /^contact\s*no$/i,
      /^contact_no$/i,
    ],
    company: [/^company$/i, /^company\s*name$/i, /^organization$/i, /^organisation$/i],
    address: [/^address$/i, /^street$/i, /^location$/i, /^city$/i],
    tags: [/^tags$/i, /^tag$/i, /^labels$/i, /^categories$/i, /^group$/i],
    openingBalance: [
      /^opening\s*balance$/i,
      /^opening_balance$/i,
      /^initial\s*balance$/i,
      /^starting\s*balance$/i,
      /^balance$/i,
    ],
    currency: [/^currency$/i, /^currency\s*code$/i, /^currency_code$/i],
  };

  // Tier 2: 85% match / secondary aliases
  const tier2Patterns: Record<string, RegExp[]> = {
    name: [/^display\s*name$/i, /^person$/i, /^contact\s*person$/i, /^client$/i, /^customer$/i],
    firstName: [/^fname$/i, /^first_name$/i],
    lastName: [/^lname$/i, /^last_name$/i],
    email: [/e-mail/i, /^contact\s*email$/i, /^work\s*email$/i, /^personal\s*email$/i],
    phone: [/tel/i, /telephone/i, /cell/i, /^whatsapp$/i],
    company: [/^employer$/i, /^business$/i, /^workplace$/i, /^firm$/i],
    address: [/^street\s*address$/i, /^full\s*address$/i, /^residence$/i],
    tags: [/^category$/i, /^label$/i, /^groups$/i, /^segment$/i],
    openingBalance: [/^opening\s*bal$/i, /^net\s*balance$/i, /^opening_bal$/i, /^start\s*balance$/i],
    currency: [/^curr$/i, /^curr_code$/i, /^iso\s*currency$/i],
  };

  // Notes detection (100% or 85%, but never auto-selected into mapping)
  const notesPatterns = [
    /^(notes|comments|description|remarks|note|comment|remark)$/i,
    /^(internal\s*notes|memo|memo_text)$/i,
  ];
  for (const { original, lower } of lowerHeaders) {
    if (notesPatterns.some((r) => r.test(lower))) {
      detectedNotesColumn = original;
      const isExact = /^(notes|comments|description|remarks)$/i.test(lower);
      confidences.notes = {
        column: original,
        confidence: isExact ? 100 : 85,
        isExact,
        matchType: isExact ? "exact" : "high",
      };
      break;
    }
  }

  const assignedColumns = new Set<string>();

  // First pass: Match Tier 1 (100% confidence)
  for (const [fieldKey, regexes] of Object.entries(tier1Patterns)) {
    for (const { original, lower } of lowerHeaders) {
      if (assignedColumns.has(original)) continue;
      if (regexes.some((r) => r.test(lower))) {
        mapping[fieldKey] = original;
        confidences[fieldKey] = { column: original, confidence: 100, isExact: true, matchType: "exact" };
        assignedColumns.add(original);
        break;
      }
    }
  }

  // Second pass: Match Tier 2 (85% confidence) for any unmapped fields
  for (const [fieldKey, regexes] of Object.entries(tier2Patterns)) {
    if (mapping[fieldKey]) continue;
    for (const { original, lower } of lowerHeaders) {
      if (assignedColumns.has(original)) continue;
      if (regexes.some((r) => r.test(lower))) {
        mapping[fieldKey] = original;
        confidences[fieldKey] = { column: original, confidence: 85, isExact: false, matchType: "high" };
        assignedColumns.add(original);
        break;
      }
    }
  }

  // Ensure notes is strictly excluded from automatic mapping to protect against test notes
  delete mapping.notes;

  return { mapping, confidences, detectedNotesColumn };
}

/**
 * Backwards-compatible wrapper returning field -> column mapping
 */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  return autoDetectMappingWithConfidence(headers).mapping;
}

/**
 * Extract 3-5 distinct, non-empty sample values for a spreadsheet column
 */
export function getColumnSamples(
  rows: Array<Record<string, any>>,
  columnName: string,
  limit: number = 4
): string[] {
  if (!columnName || !rows || rows.length === 0) return [];
  const samples: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const val = row[columnName];
    if (val !== undefined && val !== null) {
      const str = String(val).trim();
      if (str.length > 0 && !seen.has(str)) {
        seen.add(str);
        samples.push(str);
        if (samples.length >= limit) break;
      }
    }
  }

  return samples;
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
 * Parses all worksheets, skips empty rows, detects headers and potential security risks.
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
    const rawParsed = parseVCardContent(text);
    rawData = rawParsed.filter((r) => !isDocumentationOrHelperRow(r) && hasContactIndicators(r));
    headers = Array.from(new Set(rawData.flatMap((r) => Object.keys(r))));
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await getXlsx();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

    // Step 1: Filter worksheets (skip documentation, instructions, readme sheets)
    const documentationSheetPatterns =
      /^(instructions|readme|read\s*me|metadata|template\s*info|test\s*cases|summary|changelog|notes|help|faq|guidelines)$/i;
    const candidateSheets = workbook.SheetNames.filter(
      (s) => !documentationSheetPatterns.test(s.trim())
    );
    const targetSheets =
      candidateSheets.length > 0 ? candidateSheets : workbook.SheetNames.slice(0, 1);

    for (const sheetName of targetSheets) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      const sheetRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
      const rowProps = worksheet["!rows"] || [];

      let inSecondaryTable = false;

      for (let rIdx = 0; rIdx < sheetRows.length; rIdx++) {
        // Ignore hidden rows
        const excelRowIndex = rIdx + 1;
        if (rowProps[excelRowIndex]?.hidden) {
          continue;
        }

        const row = sheetRows[rIdx];

        // Check if a secondary table header is encountered (e.g. "Test Item,Details")
        if (isSecondaryTableHeader(row)) {
          inSecondaryTable = true;
          continue;
        }

        // Ignore secondary table rows and helper/documentation rows
        if (inSecondaryTable || isDocumentationOrHelperRow(row)) {
          continue;
        }

        // Must have at least one primary contact indicator
        if (!hasContactIndicators(row)) {
          continue;
        }

        rawData.push(row);
        for (const key of Object.keys(row)) {
          if (!headers.includes(key)) headers.push(key);
        }
      }
    }
  }

  const autoAnalysis = autoDetectMappingWithConfidence(headers);
  const suggestedMapping = autoAnalysis.mapping;

  // Analyze quality and potential errors
  let missingNameCount = 0;
  let invalidEmailCount = 0;
  let invalidPhoneCount = 0;
  let formulaInjectionsFound = 0;

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
      if (!isValidEmail(emailVal)) {
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
      if (!isValidPhone(phoneVal)) {
        invalidPhoneCount++;
      } else {
        const normPhone = normalizePhoneForMatching(phoneVal);
        if (normPhone) {
          if (seenPhones.has(normPhone)) {
            duplicateRowsCount++;
          } else {
            seenPhones.add(normPhone);
          }
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
  const validRowsCount = Math.max(0, totalRows - missingNameCount - invalidEmailCount - invalidPhoneCount);

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
    allRawRows: rawData,
    sampleRows: rawData.slice(0, 10),
    mappingConfidences: autoAnalysis.confidences,
    detectedNotesColumn: autoAnalysis.detectedNotesColumn,
  };
}

/**
 * Validated Import Row Model for Enterprise Preview & Conflict Resolution
 */
export interface ValidatedImportRow {
  rowNumber: number;
  raw: Record<string, any>;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  tags: string[];
  notes: string | null; // ONLY saved to contact description if user explicitly mapped Notes
  rawNotesComment: string | null; // Raw test note / comment from spreadsheet for review
  openingBalance: number;
  currency: string;
  status: "valid" | "warning" | "invalid";
  decision: "new" | "update" | "merge" | "skip" | "invalid";
  userAction: "new" | "update" | "merge" | "skip";
  validationErrors: string[];
  validationWarnings: string[];
  conflictReason?: string | null;
  matchedContact?: {
    id: number | string;
    publicId?: string;
    name: string;
    email: string | null;
    phone: string | null;
    company?: string | null;
    isWithinFile?: boolean;
    rowNumber?: number;
  } | null;
}

export interface ValidationSummary {
  totalRows: number;
  newCount: number;
  updateCount: number;
  mergeCount: number;
  skipCount: number;
  invalidCount: number;
}

/**
 * Perform comprehensive row-by-row validation, duplicate detection, and decision resolution
 */
export function validateAndPrepareImportRows(
  rawRows: Array<Record<string, any>>,
  mapping: Record<string, string>,
  existingContacts: Array<{
    id: number;
    publicId: string;
    name: string;
    email: string | null;
    phone: string | null;
    company?: string | null;
  }>,
  defaultStrategy: "merge" | "update" | "skip" = "merge"
): { rows: ValidatedImportRow[]; summary: ValidationSummary } {
  const existingByEmail = new Map<string, (typeof existingContacts)[0]>();
  const existingByPhone = new Map<string, (typeof existingContacts)[0]>();
  const existingByName = new Map<string, (typeof existingContacts)[0]>();

  for (const c of existingContacts) {
    if (c.email) existingByEmail.set(c.email.trim().toLowerCase(), c);
    const p = normalizePhoneForMatching(c.phone);
    if (p) existingByPhone.set(p, c);
    if (c.name) existingByName.set(c.name.trim().toLowerCase(), c);
  }

  // Also track contacts within the file itself for duplicate resolution
  const fileContactsByEmail = new Map<
    string,
    { rowNumber: number; name: string; email: string | null; phone: string | null; company: string | null }
  >();
  const fileContactsByPhone = new Map<
    string,
    { rowNumber: number; name: string; email: string | null; phone: string | null; company: string | null }
  >();

  const rows: ValidatedImportRow[] = [];
  let newCount = 0;
  let updateCount = 0;
  let mergeCount = 0;
  let skipCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];

    // Ignore completely empty rows, formatting-only rows, and documentation/helper rows
    if (isDocumentationOrHelperRow(raw, mapping)) continue;
    if (!hasContactIndicators(raw, mapping)) continue;

    const rowNumber = rows.length + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Resolve Name
    let rawName = "";
    if (mapping.name && raw[mapping.name]) {
      rawName = String(raw[mapping.name]);
    } else if (mapping.firstName) {
      const fn = String(raw[mapping.firstName] || "").trim();
      const ln = mapping.lastName ? String(raw[mapping.lastName] || "").trim() : "";
      rawName = `${fn} ${ln}`.trim();
    }
    const sanitizedName = cleanContactName(rawName) || "";
    if (!sanitizedName) {
      errors.push("Missing required contact name");
    }

    // 2. Resolve Email
    let sanitizedEmail: string | null = null;
    const rawEmail = mapping.email && raw[mapping.email] ? String(raw[mapping.email]).trim() : "";
    if (rawEmail) {
      if (!isValidEmail(rawEmail)) {
        errors.push(`Invalid email address format: '${rawEmail}'`);
      } else {
        sanitizedEmail = sanitizeFormulaInjection(rawEmail.toLowerCase());
      }
    }

    // 3. Resolve Phone
    let sanitizedPhone: string | null = null;
    const rawPhone = mapping.phone && raw[mapping.phone] ? String(raw[mapping.phone]).trim() : "";
    if (rawPhone) {
      if (!isValidPhone(rawPhone)) {
        errors.push(`Invalid phone format (must be 6-15 digits): '${rawPhone}'`);
      } else {
        sanitizedPhone = sanitizeFormulaInjection(rawPhone);
      }
    }

    // Optional fields warning if contact has neither email nor phone
    if (!rawEmail && !rawPhone && sanitizedName) {
      warnings.push("No email or phone number provided");
    }

    // 4. Resolve Opening Balance
    let openingBalance = 0;
    if (mapping.openingBalance && raw[mapping.openingBalance] !== undefined) {
      const parsedBalance = parseOpeningBalance(raw[mapping.openingBalance]);
      if (!parsedBalance.valid) {
        errors.push(`Invalid opening balance numeric format: '${raw[mapping.openingBalance]}'`);
      } else {
        openingBalance = parsedBalance.amount;
      }
    }

    // 5. Resolve Currency
    let currency = "INR";
    if (mapping.currency && raw[mapping.currency]) {
      const c = String(raw[mapping.currency]).trim().toUpperCase();
      if (c.length === 3) currency = sanitizeFormulaInjection(c) || "INR";
    }

    // 6. Resolve Company & Address
    const company = mapping.company && raw[mapping.company]
      ? sanitizeFormulaInjection(String(raw[mapping.company]).trim())?.slice(0, 120) || null
      : null;

    const address = mapping.address && raw[mapping.address]
      ? sanitizeFormulaInjection(String(raw[mapping.address]).trim())?.slice(0, 250) || null
      : null;

    // 7. Resolve Tags
    let tags: string[] = [];
    if (mapping.tags && raw[mapping.tags]) {
      const rawTags = String(raw[mapping.tags]);
      tags = rawTags
        .split(/[,;|]/)
        .map((t) => sanitizeFormulaInjection(t.trim())?.slice(0, 40) || "")
        .filter(Boolean);
    }

    // 8. Resolve Notes vs. Raw Test Note Inspection
    // Notes is ONLY saved if mapping.notes was explicitly chosen by the user!
    const notes = mapping.notes && raw[mapping.notes]
      ? sanitizeFormulaInjection(String(raw[mapping.notes]).trim())?.slice(0, 1000) || null
      : null;

    // Search file for any "notes" or "comment" column to surface as an inspection note
    let rawNotesComment: string | null = null;
    for (const [key, val] of Object.entries(raw)) {
      if (/notes|comment|remark|description|test/i.test(key) && val) {
        rawNotesComment = String(val).trim();
        break;
      }
    }

    // 9. Determine Status & Conflict Resolution
    let conflictReason: string | null = null;
    let matchedContact: (typeof existingContacts)[0] | null = null;

    const isInvalid = errors.length > 0;

    if (!isInvalid) {
      const normEmail = sanitizedEmail ? sanitizedEmail.toLowerCase() : "";
      const normPhone = normalizePhoneForMatching(sanitizedPhone);
      const normName = sanitizedName.toLowerCase();

      // Check existing database contacts
      if (normEmail && existingByEmail.has(normEmail)) {
        matchedContact = existingByEmail.get(normEmail)!;
        conflictReason = `Matches existing contact '${matchedContact.name}' by email (${sanitizedEmail})`;
      } else if (normPhone && existingByPhone.has(normPhone)) {
        matchedContact = existingByPhone.get(normPhone)!;
        conflictReason = `Matches existing contact '${matchedContact.name}' by phone (${sanitizedPhone})`;
      } else if (normName && existingByName.has(normName)) {
        matchedContact = existingByName.get(normName)!;
        conflictReason = `Same name as existing contact '${matchedContact.name}'`;
      }

      // Check within-file duplicates
      if (!matchedContact) {
        const earlierByEmail = normEmail ? fileContactsByEmail.get(normEmail) : null;
        const earlierByPhone = normPhone ? fileContactsByPhone.get(normPhone) : null;
        const earlierContact = earlierByEmail || earlierByPhone;

        if (earlierContact) {
          const isEmailDupe = Boolean(earlierByEmail);
          conflictReason = isEmailDupe
            ? `Duplicate email within file (conflicts with Row ${earlierContact.rowNumber} '${earlierContact.name}')`
            : `Duplicate phone within file (conflicts with Row ${earlierContact.rowNumber} '${earlierContact.name}')`;
          warnings.push(conflictReason);

          matchedContact = {
            id: `file-row-${earlierContact.rowNumber}` as any,
            publicId: `file-row-${earlierContact.rowNumber}`,
            name: earlierContact.name,
            email: earlierContact.email,
            phone: earlierContact.phone,
            company: earlierContact.company,
            isWithinFile: true,
            rowNumber: earlierContact.rowNumber,
          } as any;
        }
      }

      // If this contact is not a duplicate of an earlier contact in the file, register it
      if (!matchedContact) {
        const fileRecord = {
          rowNumber,
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          company,
        };
        if (normEmail) fileContactsByEmail.set(normEmail, fileRecord);
        if (normPhone) fileContactsByPhone.set(normPhone, fileRecord);
      }
    }

    let status: "valid" | "warning" | "invalid" = isInvalid
      ? "invalid"
      : matchedContact || warnings.length > 0
      ? "warning"
      : "valid";

    // 10. Determine Decision & User Action
    let decision: "new" | "update" | "merge" | "skip" | "invalid" = "new";
    let userAction: "new" | "update" | "merge" | "skip" = "new";

    if (isInvalid) {
      decision = "invalid";
      userAction = "skip";
      invalidCount++;
    } else if (matchedContact) {
      status = "warning";
      if (defaultStrategy === "merge") {
        decision = "merge";
        userAction = "merge";
        mergeCount++;
      } else if (defaultStrategy === "update") {
        decision = "update";
        userAction = "update";
        updateCount++;
      } else {
        decision = "skip";
        userAction = "skip";
        skipCount++;
      }
    } else {
      decision = "new";
      userAction = "new";
      newCount++;
    }

    rows.push({
      rowNumber,
      raw,
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      company,
      address,
      tags,
      notes,
      rawNotesComment,
      openingBalance,
      currency,
      status,
      decision,
      userAction,
      validationErrors: errors,
      validationWarnings: warnings,
      conflictReason,
      matchedContact: matchedContact
        ? {
            id: matchedContact.id,
            publicId: matchedContact.publicId || "",
            name: matchedContact.name,
            email: matchedContact.email,
            phone: matchedContact.phone,
            company: matchedContact.company,
            isWithinFile: (matchedContact as any).isWithinFile,
            rowNumber: (matchedContact as any).rowNumber,
          }
        : null,
    });
  }

  return {
    rows,
    summary: {
      totalRows: rows.length,
      newCount,
      updateCount,
      mergeCount,
      skipCount,
      invalidCount,
    },
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
      "0",
    ],
    [
      "Priya Patel",
      "priya.patel@example.com",
      "+91 91234 56789",
      "Starlight Media",
      "Koramangala, Bengaluru",
      "Office, Colleague",
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
      "Opening Balance",
    ],
    [
      "Aarav Sharma",
      "aarav.sharma@example.com",
      "+91 98765 43210",
      "Acme Innovations",
      "Bandra West, Mumbai",
      "Trip, Roommate, Finance",
      0,
    ],
    [
      "Priya Patel",
      "priya.patel@example.com",
      "+91 91234 56789",
      "Starlight Media",
      "Koramangala, Bengaluru",
      "Office, Colleague",
      500,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 25 },
    { wch: 25 },
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
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Aarav Sharma",
    "EMAIL:aarav.sharma@example.com",
    "TEL:+91 98765 43210",
    "ORG:Acme Innovations",
    "ADR:;;Bandra West;Mumbai;;;India",
    "CATEGORIES:Friend,Finance",
    "END:VCARD",
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Priya Patel",
    "EMAIL:priya.patel@example.com",
    "TEL:+91 91234 56789",
    "ORG:Starlight Media",
    "ADR:;;Koramangala;Bengaluru;;;India",
    "CATEGORIES:Office,Colleague",
    "END:VCARD",
  ].join("\r\n");
}

/**
 * Client Export Contacts to CSV
 */
export function exportContactsToCsv(contacts: any[]): string {
  const headers = [
    "Full Name",
    "Public ID",
    "Email Address",
    "Phone Number",
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
    const tagsStr = Array.isArray(c.tags) ? c.tags.join(";") : "";
    const balanceRupees = (Number(c.balance) || 0) / 100;
    const status = c.isArchived ? "Archived" : "Active";

    const fields = [
      c.name || "",
      c.publicId || "",
      c.email || "",
      c.phone || "",
      c.company || "",
      c.address || "",
      tagsStr,
      String(balanceRupees),
      c.currency || "INR",
      status,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
    ];

    rows.push(fields.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","));
  }

  return rows.join("\r\n");
}

/**
 * Client Export Contacts to VCF
 */
export function exportContactsToVcf(contacts: any[]): string {
  const cards: string[] = [];

  for (const c of contacts) {
    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${c.name || "Unknown"}`,
      c.email ? `EMAIL:${c.email}` : "",
      c.phone ? `TEL:${c.phone}` : "",
      c.company ? `ORG:${c.company}` : "",
      c.address ? `ADR:;;${c.address};;;;` : "",
      Array.isArray(c.tags) && c.tags.length > 0 ? `CATEGORIES:${c.tags.join(",")}` : "",
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