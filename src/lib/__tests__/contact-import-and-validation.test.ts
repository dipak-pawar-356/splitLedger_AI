import { describe, it, expect } from "vitest";
import {
  cleanContactName,
  sanitizeFormulaInjection,
  isValidEmail,
  normalizePhoneForMatching,
  isValidPhone,
  parseOpeningBalance,
  autoDetectMapping,
  validateAndPrepareImportRows,
  isTestingOrAssertionNote,
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
});
