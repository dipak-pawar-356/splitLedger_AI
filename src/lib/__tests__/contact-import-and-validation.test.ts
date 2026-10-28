import { describe, it, expect } from "vitest";
import {
  cleanContactName,
  sanitizeFormulaInjection,
  isValidEmail,
  normalizePhoneForMatching,
  isValidPhone,
  parseOpeningBalance,
  autoDetectMapping,
  autoDetectMappingWithConfidence,
  getColumnSamples,
  validateAndPrepareImportRows,
  isTestingOrAssertionNote,
  isDocumentationOrHelperRow,
  isSecondaryTableHeader,
  hasContactIndicators,
} from "@/lib/contacts/contact-parser";

describe("Contact Import Validation & Security Engine", () => {
  describe("Formula & CSV Injection Protection (CWE-1236)", () => {
    it("should escape formulas starting with =, +, -, @, \\t, \\r", () => {
      expect(sanitizeFormulaInjection("=SUM(1,1)")).toBe("'=SUM(1,1)");
      expect(sanitizeFormulaInjection("+1+2")).toBe("'+1+2");
      expect(sanitizeFormulaInjection("-2+5")).toBe("'-2+5");
      expect(sanitizeFormulaInjection("@SUM()")).toBe("'@SUM()");
      expect(sanitizeFormulaInjection("\tcmd")).toBe("'cmd");
    });

    it("should not modify safe alphanumeric text", () => {
      expect(sanitizeFormulaInjection("Aarav Sharma")).toBe("Aarav Sharma");
      expect(sanitizeFormulaInjection("aarav@example.com")).toBe("aarav@example.com");
      expect(sanitizeFormulaInjection("+91 9876543210")).toBe("'+91 9876543210");
    });
  });

  describe("Contact Name Cleaning & Unicode Preservation", () => {
    it("should collapse duplicate spaces and trim", () => {
      expect(cleanContactName("   Aarav    Sharma   ")).toBe("Aarav Sharma");
    });

    it("should preserve Marathi and Devanagari script names", () => {
      expect(cleanContactName("आनंद देशमुख")).toBe("आनंद देशमुख");
      expect(cleanContactName("स्नेहा कुलकर्णी")).toBe("स्नेहा कुलकर्णी");
    });

    it("should preserve Hindi names", () => {
      expect(cleanContactName("अमित कुमार वर्मा")).toBe("अमित कुमार वर्मा");
    });

    it("should preserve special characters and apostrophes", () => {
      expect(cleanContactName("Shaun O'Neil")).toBe("Shaun O'Neil");
      expect(cleanContactName("D'Souza")).toBe("D'Souza");
      expect(cleanContactName("Mary-Jane Watson")).toBe("Mary-Jane Watson");
    });

    it("should return null for empty or whitespace-only names", () => {
      expect(cleanContactName("")).toBeNull();
      expect(cleanContactName("    ")).toBeNull();
      expect(cleanContactName(null)).toBeNull();
    });
  });

  describe("Email Validation", () => {
    it("should accept valid emails", () => {
      expect(isValidEmail("aarav.kulkarni@example.com")).toBe(true);
      expect(isValidEmail("user+tag@domain.co.in")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("aarav@")).toBe(false);
    });

    it("should allow empty/null as optional field", () => {
      expect(isValidEmail("")).toBe(true);
      expect(isValidEmail(null)).toBe(true);
      expect(isValidEmail(undefined)).toBe(true);
    });
  });

  describe("Phone Normalization & Validation", () => {
    it("should normalize +91 and 91 and leading 0 country code formats to 10 digits", () => {
      expect(normalizePhoneForMatching("+91 98765 43210")).toBe("9876543210");
      expect(normalizePhoneForMatching("919876543210")).toBe("9876543210");
      expect(normalizePhoneForMatching("09876543210")).toBe("9876543210");
      expect(normalizePhoneForMatching("9876543210")).toBe("9876543210");
    });

    it("should validate phone length between 6 and 15 digits", () => {
      expect(isValidPhone("+91 98765 43210")).toBe(true);
      expect(isValidPhone("12345")).toBe(false); // too short
      expect(isValidPhone("")).toBe(true); // optional
    });
  });

  describe("Opening Balance Parsing & Financial Formats", () => {
    it("should support zero balance", () => {
      expect(parseOpeningBalance(0)).toEqual({ valid: true, amount: 0 });
      expect(parseOpeningBalance("0")).toEqual({ valid: true, amount: 0 });
      expect(parseOpeningBalance("")).toEqual({ valid: true, amount: 0 });
    });

    it("should support positive decimal balance", () => {
      expect(parseOpeningBalance(250.5)).toEqual({ valid: true, amount: 250.5 });
      expect(parseOpeningBalance("99.99")).toEqual({ valid: true, amount: 99.99 });
      expect(parseOpeningBalance("₹150.00")).toEqual({ valid: true, amount: 150 });
    });

    it("should support negative opening balance (debt/payable)", () => {
      expect(parseOpeningBalance(-450)).toEqual({ valid: true, amount: -450 });
      expect(parseOpeningBalance("-450")).toEqual({ valid: true, amount: -450 });
      expect(parseOpeningBalance("-25.75")).toEqual({ valid: true, amount: -25.75 });
    });

    it("should reject non-numeric invalid formats", () => {
      expect(parseOpeningBalance("invalid-number").valid).toBe(false);
      expect(parseOpeningBalance("abc123").valid).toBe(false);
    });
  });

  describe("Intelligent Header Auto-Mapping", () => {
    it("should NOT auto-map the Notes column to prevent test notes from becoming contact descriptions", () => {
      const headers = ["Full Name", "Email Address", "Phone Number", "Notes", "Opening Balance"];
      const mapping = autoDetectMapping(headers);

      expect(mapping.name).toBe("Full Name");
      expect(mapping.email).toBe("Email Address");
      expect(mapping.phone).toBe("Phone Number");
      expect(mapping.openingBalance).toBe("Opening Balance");
      expect(mapping.notes).toBeUndefined(); // STRICT: Must NOT be mapped automatically
    });
  });

  describe("Row Validation & Duplicate Detection Matrix", () => {
    const existingContacts = [
      {
        id: 101,
        publicId: "ct_aarav",
        name: "Aarav Kulkarni",
        email: "aarav.kulkarni@example.com",
        phone: "+91 98765 43210",
        company: "Acme Corp",
      },
    ];

    it("should validate and categorize valid rows, duplicates, and invalid rows", () => {
      const rawRows = [
        // 1. Valid row with no conflict
        {
          "Full Name": "Priya Sharma",
          "Email Address": "priya.sharma@example.com",
          "Phone Number": "+91 91234 56789",
          "Opening Balance": "250.50",
          Notes: "Valid contact - positive balance",
        },
        // 2. Duplicate phone conflict with Aarav Kulkarni
        {
          "Full Name": "Aarav Kulkarni",
          "Email Address": "aarav.work@example.com",
          "Phone Number": "+91 98765 43210", // Matches existing contact #101
          "Opening Balance": "0",
          Notes: "Duplicate phone test - conflicts with Aarav Kulkarni",
        },
        // 3. Invalid row: missing required name
        {
          "Full Name": "",
          "Email Address": "noname@example.com",
          "Phone Number": "+91 90000 00000",
          Notes: "Validation test - required name missing",
        },
        // 4. Invalid row: malformed email
        {
          "Full Name": "Test User",
          "Email Address": "malformed-email",
          "Phone Number": "+91 90000 11111",
          Notes: "Validation test - invalid email",
        },
        // 5. Negative balance row
        {
          "Full Name": "Rohan Patil",
          "Email Address": "rohan.patil@example.com",
          "Phone Number": "+91 98888 77777",
          "Opening Balance": "-450",
          Notes: "Valid contact - negative balance",
        },
        // 6. Marathi Unicode name
        {
          "Full Name": "स्नेहा देशमुख",
          "Email Address": "sneha.deshmukh@example.com",
          "Phone Number": "+91 95555 44444",
          Notes: "Valid contact - Marathi surname",
        },
      ];

      const mapping = {
        name: "Full Name",
        email: "Email Address",
        phone: "Phone Number",
        openingBalance: "Opening Balance",
        // Notes is unmapped!
      };

      const result = validateAndPrepareImportRows(rawRows, mapping, existingContacts, "merge");

      expect(result.summary.totalRows).toBe(6);
      expect(result.summary.invalidCount).toBe(2); // Rows 3 & 4
      expect(result.summary.mergeCount).toBe(1); // Row 2 matches Aarav Kulkarni
      expect(result.summary.newCount).toBe(3); // Rows 1, 5, 6

      // Row 1 (Priya Sharma): Valid, New, test note in rawNotesComment but notes is null
      const row1 = result.rows[0];
      expect(row1.status).toBe("valid");
      expect(row1.decision).toBe("new");
      expect(row1.notes).toBeNull(); // Not saved as contact description!
      expect(row1.rawNotesComment).toBe("Valid contact - positive balance"); // Visible for inspection
      expect(row1.openingBalance).toBe(250.5);

      // Row 2 (Duplicate phone with Aarav): Warning, Merge, matchedContact linked
      const row2 = result.rows[1];
      expect(row2.status).toBe("warning");
      expect(row2.decision).toBe("merge");
      expect(row2.matchedContact?.id).toBe(101);
      expect(row2.conflictReason).toContain("Matches existing contact 'Aarav Kulkarni'");

      // Row 3 (Missing name): Invalid
      const row3 = result.rows[2];
      expect(row3.status).toBe("invalid");
      expect(row3.validationErrors).toContain("Missing required contact name");
      expect(row3.userAction).toBe("skip");

      // Row 4 (Malformed email): Invalid
      const row4 = result.rows[3];
      expect(row4.status).toBe("invalid");
      expect(row4.validationErrors[0]).toContain("Invalid email address format");

      // Row 5 (Rohan Patil): Negative balance parsed properly
      const row5 = result.rows[4];
      expect(row5.openingBalance).toBe(-450);
      expect(row5.status).toBe("valid");

      // Row 6 (Sneha Deshmukh): Marathi script preserved
      const row6 = result.rows[5];
      expect(row6.name).toBe("स्नेहा देशमुख");
      expect(row6.status).toBe("valid");
    });
  });

  describe("Spreadsheet Test Notes Detection (isTestingOrAssertionNote)", () => {
    it("should detect all benchmark test notes from import spreadsheets", () => {
      const benchmarkTestNotes = [
        "Valid contact - baseline",
        "Valid contact - positive balance",
        "Valid contact - negative balance",
        "Valid contact - Marathi surname",
        "Valid contact - multiword name",
        "Valid contact - decimal balance",
        "Valid contact - phone and email",
        "Unicode/Devanagari name test",
        "Duplicate email test - conflicts with Aarav Kulkarni",
        "Duplicate phone test - conflicts with Aarav Kulkarni",
        "Validation test - invalid email",
        "Optional email blank - should be allowed if app rules permit",
        "Optional phone blank - should be allowed if app rules permit",
        "Validation test - required name missing",
        "Validation test - phone may be too short",
        "Check whether negative opening balances are supported",
        "Special character/apostrophe test",
        "Test long notes and text-length validation. Test long notes and text-length validation.",
        "@SUM(1,1)",
        "'=SUM(1,1)",
        "Valid contact - baseline --- Merged Notes: Duplicate phone test - conflicts with Aarav Kulkarni",
      ];

      for (const note of benchmarkTestNotes) {
        expect(isTestingOrAssertionNote(note), `Failed for note: "${note}"`).toBe(true);
      }
    });

    it("should NOT flag genuine contact descriptions", () => {
      const genuineNotes = [
        "Prefers communication via WhatsApp after 4 PM",
        "Key supplier for paper and packaging materials",
        "Met at Bangalore FinTech Conference 2026",
        "Payment terms: net 30 days",
      ];

      for (const note of genuineNotes) {
        expect(isTestingOrAssertionNote(note)).toBe(false);
      }
    });
  });

  describe("Intelligent Field Mapping Engine & Confidence Scoring", () => {
    it("should match 100% confidence for exact and primary headers", () => {
      const headers = ["Name", "Email Address", "Phone Number", "Opening Balance", "Currency Code"];
      const result = autoDetectMappingWithConfidence(headers);

      expect(result.mapping.name).toBe("Name");
      expect(result.confidences.name?.confidence).toBe(100);

      expect(result.mapping.email).toBe("Email Address");
      expect(result.confidences.email?.confidence).toBe(100);

      expect(result.mapping.phone).toBe("Phone Number");
      expect(result.confidences.phone?.confidence).toBe(100);

      expect(result.mapping.openingBalance).toBe("Opening Balance");
      expect(result.confidences.openingBalance?.confidence).toBe(100);

      expect(result.mapping.currency).toBe("Currency Code");
      expect(result.confidences.currency?.confidence).toBe(100);
    });

    it("should match 85% confidence for secondary synonyms and aliases", () => {
      const headers = ["Display Name", "e-mail", "Telephone", "Opening Bal", "Curr"];
      const result = autoDetectMappingWithConfidence(headers);

      expect(result.mapping.name).toBe("Display Name");
      expect(result.confidences.name?.confidence).toBe(85);

      expect(result.mapping.email).toBe("e-mail");
      expect(result.confidences.email?.confidence).toBe(85);

      expect(result.mapping.phone).toBe("Telephone");
      expect(result.confidences.phone?.confidence).toBe(85);

      expect(result.mapping.openingBalance).toBe("Opening Bal");
      expect(result.confidences.openingBalance?.confidence).toBe(85);

      expect(result.mapping.currency).toBe("Curr");
      expect(result.confidences.currency?.confidence).toBe(85);
    });

    it("should detect notes column but keep mapping.notes empty by default", () => {
      const headers = ["Full Name", "Email", "Phone", "Notes"];
      const result = autoDetectMappingWithConfidence(headers);

      expect(result.detectedNotesColumn).toBe("Notes");
      expect(result.confidences.notes?.confidence).toBe(100);
      expect(result.mapping.notes).toBeUndefined(); // Protected from automatic mapping!
    });
  });

  describe("Column Sample Extraction (getColumnSamples)", () => {
    it("should return up to 4 distinct, non-empty sample strings", () => {
      const rows = [
        { Name: "Aarav Kulkarni", Email: "aarav@example.com" },
        { Name: "Aarav Kulkarni", Email: "aarav.dup@example.com" }, // duplicate name
        { Name: "", Email: "empty@example.com" },
        { Name: "Sneha Deshmukh", Email: "sneha@example.com" },
        { Name: "Rohan Patil", Email: "rohan@example.com" },
        { Name: "Ananya Iyer", Email: "ananya@example.com" },
      ];

      const samples = getColumnSamples(rows, "Name", 3);
      expect(samples).toEqual(["Aarav Kulkarni", "Sneha Deshmukh", "Rohan Patil"]);
      expect(samples.length).toBe(3);
    });

    it("should return empty array for non-existent column or empty rows", () => {
      expect(getColumnSamples([], "Name")).toEqual([]);
      expect(getColumnSamples([{ Other: "val" }], "Name")).toEqual([]);
    });
  });

  describe("Documentation, Helper & Secondary Table Filtering", () => {
    it("should detect secondary table headers like 'Test Item,Details'", () => {
      expect(isSecondaryTableHeader({ Name: "Test Item", Email: "Details" })).toBe(true);
      expect(isSecondaryTableHeader({ Key: "Metadata", Value: "Value" })).toBe(true);
      expect(isSecondaryTableHeader({ Name: "Aarav Kulkarni", Email: "aarav@example.com" })).toBe(false);
    });

    it("should detect documentation and helper rows from test sheets", () => {
      const docRows = [
        { Name: "Purpose", Email: "Synthetic data for testing SplitLedger AI contact import. Not real people." },
        { Name: "Total rows", Email: "20" },
        { Name: "Expected basic valid examples", Email: "Rows 1-8, subject to application validation rules" },
        { Name: "Duplicate email", Email: "Row 9 duplicates row 1 email" },
        { Name: "Duplicate phone", Email: "Row 10 duplicates row 1 phone" },
        { Name: "Invalid email", Email: "Row 11" },
        { Name: "Missing required name", Email: "Row 14" },
        { Name: "Invalid/short phone", Email: "Row 15" },
        { Name: "Unicode name", Email: "Row 8" },
        { Name: "Formula/CSV injection safety", Email: "Rows 19-20; ensure treated as plain text and never executed" },
        { Name: "Optional fields", Email: "Rows 12-13 test blank email/phone handling" },
        { Name: "Opening balance", Email: "Includes zero, positive, decimal and negative examples; confirm product rules" },
        { Name: "Recommended test sequence", Email: "Upload → analyze → map fields → review validation → inspect duplicates" },
        { Name: "Safety note", Email: "Do not use this file as actual financial/contact data." },
        { Name: "----------------", Email: "----------------" }, // Formatting row
        { Name: "", Email: "" }, // Empty row
      ];

      for (const row of docRows) {
        expect(isDocumentationOrHelperRow(row), `Failed for row: ${JSON.stringify(row)}`).toBe(true);
        expect(hasContactIndicators(row), `Should not have contact indicators: ${JSON.stringify(row)}`).toBe(false);
      }
    });

    it("should NOT filter out genuine contacts, including edge cases", () => {
      const realContacts = [
        { Name: "Aarav Kulkarni", Email: "aarav.kulkarni@example.com", Phone: "+919876540101" },
        { Name: "Test Duplicate Email", Email: "aarav.kulkarni@example.com", Phone: "+919876540109" },
        { Name: "Invalid Email Contact", Email: "not-an-email", Phone: "+919876540110" },
        { Name: "Missing Email Contact", Email: "", Phone: "+919876540111" },
        { Name: "Missing Phone Contact", Email: "no.phone@example.com", Phone: "" },
        { Name: "", Email: "missing.name@example.com", Phone: "+919876540112" },
        { Name: "Formula Injection Test", Email: "formula.test@example.com", Phone: "+919876540116" },
        { Name: "CSV Injection Test", Email: "csv.test@example.com", Phone: "+919876540117" },
        { Name: "Special Chars O'Neil", Email: "oneil.test@example.com", Phone: "+919876540114" },
        { Name: "काव्या पाटील", Email: "kavya.patil@example.com", Phone: "+919876540108" },
      ];

      for (const contact of realContacts) {
        expect(isDocumentationOrHelperRow(contact), `Incorrectly flagged: ${contact.Name}`).toBe(false);
        expect(hasContactIndicators(contact), `Missing contact indicators: ${contact.Name}`).toBe(true);
      }
    });
  });

  describe("Benchmark 34-Row Test Spreadsheet Import & Duplicate Linking", () => {
    it("should process exactly 20 contacts (17 valid, 3 invalid, 2 duplicate warnings) and ignore 14 documentation rows", () => {
      // 20 Contacts + 14 Documentation Rows = 34 data rows from user spreadsheet
      const rawSpreadsheetRows = [
        // 1-8 Valid baseline contacts
        { Name: "Aarav Kulkarni", Email: "aarav.kulkarni@example.com", Phone: "+919876540101", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Valid contact - baseline" },
        { Name: "Priya Sharma", Email: "priya.sharma@example.com", Phone: "+919876540102", Currency: "INR", "Opening Balance (₹)": "1250.5", Notes: "Valid contact - positive balance" },
        { Name: "Rohan Patil", Email: "rohan.patil@example.com", Phone: "+919876540103", Currency: "INR", "Opening Balance (₹)": "-450", Notes: "Valid contact - negative balance" },
        { Name: "Sneha Deshmukh", Email: "sneha.deshmukh@example.com", Phone: "+919876540104", Currency: "INR", "Opening Balance (₹)": "300", Notes: "Valid contact - Marathi surname" },
        { Name: "Mohammed Khan", Email: "mohammed.khan@example.com", Phone: "+919876540105", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Valid contact - multiword name" },
        { Name: "Ananya Iyer", Email: "ananya.iyer@example.com", Phone: "+919876540106", Currency: "INR", "Opening Balance (₹)": "899.99", Notes: "Valid contact - decimal balance" },
        { Name: "Vikram Singh", Email: "vikram.singh@example.com", Phone: "+919876540107", Currency: "INR", "Opening Balance (₹)": "150", Notes: "Valid contact - phone and email" },
        { Name: "काव्या पाटील", Email: "kavya.patil@example.com", Phone: "+919876540108", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Unicode/Devanagari name test" },

        // 9-10 Within-file duplicates (conflicts with Aarav Kulkarni)
        { Name: "Test Duplicate Email", Email: "aarav.kulkarni@example.com", Phone: "+919876540109", Currency: "INR", "Opening Balance (₹)": "50", Notes: "Duplicate email test - conflicts with Aarav Kulkarni" },
        { Name: "Test Duplicate Phone", Email: "duplicate.phone@example.com", Phone: "+919876540101", Currency: "INR", "Opening Balance (₹)": "75", Notes: "Duplicate phone test - conflicts with Aarav Kulkarni" },

        // 11 Invalid email
        { Name: "Invalid Email Contact", Email: "not-an-email", Phone: "+919876540110", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Validation test - invalid email" },

        // 12-13 Optional fields (blank email / phone)
        { Name: "Missing Email Contact", Email: "", Phone: "+919876540111", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Optional email blank - should be allowed if app rules permit" },
        { Name: "Missing Phone Contact", Email: "no.phone@example.com", Phone: "", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Optional phone blank - should be allowed if app rules permit" },

        // 14 Missing required name
        { Name: "", Email: "missing.name@example.com", Phone: "+919876540112", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Validation test - required name missing" },

        // 15 Invalid phone (too short)
        { Name: "Invalid Phone Contact", Email: "invalid.phone@example.com", Phone: "12345", Currency: "INR", "Opening Balance (₹)": "0", Notes: "Validation test - phone may be too short" },

        // 16-18 Negative balance, special characters, long notes
        { Name: "Negative Opening Balance", Email: "negative.balance@example.com", Phone: "+919876540113", Currency: "INR", "Opening Balance (₹)": "-125.75", Notes: "Check whether negative opening balances are supported" },
        { Name: "Special Chars O'Neil", Email: "oneil.test@example.com", Phone: "+919876540114", Currency: "INR", "Opening Balance (₹)": "25", Notes: "Special character/apostrophe test" },
        { Name: "Long Notes Contact", Email: "long.notes@example.com", Phone: "+919876540115", Currency: "INR", "Opening Balance (₹)": "10", Notes: "Test long notes and text-length validation." },

        // 19-20 Formula and CSV injection safety
        { Name: "Formula Injection Test", Email: "formula.test@example.com", Phone: "+919876540116", Currency: "INR", "Opening Balance (₹)": "0", Notes: "" },
        { Name: "CSV Injection Test", Email: "csv.test@example.com", Phone: "+919876540117", Currency: "INR", "Opening Balance (₹)": "0", Notes: "@SUM(1,1)" },

        // 21-35 Documentation & helper rows (MUST BE IGNORED)
        { Name: "Test Item", Email: "Details" },
        { Name: "Purpose", Email: "Synthetic data for testing SplitLedger AI contact import. Not real people." },
        { Name: "Total rows", Email: "20" },
        { Name: "Expected basic valid examples", Email: "Rows 1-8, subject to application validation rules" },
        { Name: "Duplicate email", Email: "Row 9 duplicates row 1 email" },
        { Name: "Duplicate phone", Email: "Row 10 duplicates row 1 phone" },
        { Name: "Invalid email", Email: "Row 11" },
        { Name: "Missing required name", Email: "Row 14" },
        { Name: "Invalid/short phone", Email: "Row 15" },
        { Name: "Unicode name", Email: "Row 8" },
        { Name: "Formula/CSV injection safety", Email: "Rows 19-20; ensure treated as plain text and never executed" },
        { Name: "Optional fields", Email: "Rows 12-13 test blank email/phone handling" },
        { Name: "Opening balance", Email: "Includes zero, positive, decimal and negative examples; confirm product rules" },
        { Name: "Recommended test sequence", Email: "Upload → analyze → map fields → review validation → inspect duplicates" },
        { Name: "Safety note", Email: "Do not use this file as actual financial/contact data." },
      ];

      const mapping = {
        name: "Name",
        email: "Email",
        phone: "Phone",
        currency: "Currency",
        openingBalance: "Opening Balance (₹)",
        notes: "", // Protected default
      };

      const result = validateAndPrepareImportRows(
        rawSpreadsheetRows,
        mapping,
        [], // No existing DB contacts
        "merge" // Default strategy
      );

      // 1. Total Contact Count MUST equal 20 (14 documentation rows ignored!)
      expect(result.rows.length).toBe(20);
      expect(result.summary.totalRows).toBe(20);

      // 2. Exactly 3 records are invalid
      expect(result.summary.invalidCount).toBe(3);

      const invalidRows = result.rows.filter((r) => r.status === "invalid");
      expect(invalidRows.length).toBe(3);
      expect(invalidRows.some((r) => r.name === "Invalid Email Contact")).toBe(true);
      expect(invalidRows.some((r) => r.name === "" && r.email === "missing.name@example.com")).toBe(true);
      expect(invalidRows.some((r) => r.name === "Invalid Phone Contact")).toBe(true);

      // 3. Exactly 17 records are valid
      const validRows = result.rows.filter((r) => r.status !== "invalid");
      expect(validRows.length).toBe(17);

      // 4. Exactly 2 duplicate warnings (conflicts with Aarav Kulkarni)
      const warningRows = result.rows.filter((r) => r.status === "warning");
      expect(warningRows.length).toBe(2);

      const dupeEmailRow = result.rows.find((r) => r.name === "Test Duplicate Email");
      expect(dupeEmailRow?.status).toBe("warning");
      expect(dupeEmailRow?.conflictReason).toContain("conflicts with Row 1 'Aarav Kulkarni'");
      expect(dupeEmailRow?.matchedContact?.name).toBe("Aarav Kulkarni");
      expect(dupeEmailRow?.decision).toBe("merge");
      expect(dupeEmailRow?.userAction).toBe("merge");

      const dupePhoneRow = result.rows.find((r) => r.name === "Test Duplicate Phone");
      expect(dupePhoneRow?.status).toBe("warning");
      expect(dupePhoneRow?.conflictReason).toContain("conflicts with Row 1 'Aarav Kulkarni'");
      expect(dupePhoneRow?.matchedContact?.name).toBe("Aarav Kulkarni");
      expect(dupePhoneRow?.decision).toBe("merge");
      expect(dupePhoneRow?.userAction).toBe("merge");

      // 5. Injection safety: Formula and CSV injection rows are valid after sanitization
      const formulaRow = result.rows.find((r) => r.name === "Formula Injection Test");
      expect(formulaRow?.status).toBe("valid");

      const csvRow = result.rows.find((r) => r.name === "CSV Injection Test");
      expect(csvRow?.status).toBe("valid");

      // 6. Optional fields: Missing Email and Missing Phone are valid
      const missingEmailRow = result.rows.find((r) => r.name === "Missing Email Contact");
      expect(missingEmailRow?.status).toBe("valid");

      const missingPhoneRow = result.rows.find((r) => r.name === "Missing Phone Contact");
      expect(missingPhoneRow?.status).toBe("valid");

      // 7. Negative opening balance parsed correctly
      const negativeRow = result.rows.find((r) => r.name === "Negative Opening Balance");
      expect(negativeRow?.status).toBe("valid");
      expect(negativeRow?.openingBalance).toBe(-125.75);

      // 8. Unicode / Marathi name preserved
      const unicodeRow = result.rows.find((r) => r.name === "काव्या पाटील");
      expect(unicodeRow?.status).toBe("valid");
      expect(unicodeRow?.name).toBe("काव्या पाटील");

      // 9. None of the documentation rows exist in the output
      const docLabels = ["Purpose", "Total rows", "Test Item", "Expected basic valid examples", "Safety note"];
      for (const label of docLabels) {
        expect(result.rows.some((r) => r.name === label)).toBe(false);
      }
    });
  });
});
