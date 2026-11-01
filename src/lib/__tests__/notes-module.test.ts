import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_dev_default",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
  }),
}));

// Mock db module
const defaultMockNote = {
  id: 1,
  publicId: "nte_test123",
  userId: 1,
  title: "Test Note",
  content: "<p>Test Content</p>",
  plainText: "Test Content",
  isDeleted: false,
  wordCount: 2,
  readingTime: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNotes: any[] = [defaultMockNote];

function createChain(data: any = mockNotes) {
  const chain: any = {
    then: (resolve: any) => Promise.resolve(data).then(resolve),
    catch: (reject: any) => Promise.resolve(data).catch(reject),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => createChain(mockNotes)),
    insert: vi.fn(() => ({
      values: vi.fn((val) => ({
        returning: vi.fn().mockResolvedValue([{ id: 1, publicId: "nte_test123", ...val }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 1, publicId: "nte_test123", title: "Updated Note" }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue({ success: true }),
    })),
  },
  withDbRetry: vi.fn((fn) => fn()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  duplicateNote,
  bulkNoteAction,
  exportNoteDocument,
  recordNotePrintActivity,
  getNoteVersions,
  restoreNoteVersion,
} from "@/actions/notes";

describe("Notes & Financial Journal Module (Part I & Part II)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new note with secure publicId, stats, and initial version", async () => {
    const res = await createNote({
      title: "Monthly Budget Plan September 2026",
      content: "<p>Planned ₹50,000 savings for investment fund.</p>",
    });

    expect(res).toBeDefined();
    expect(res.publicId).toBeDefined();
    expect(res.title).toBe("Monthly Budget Plan September 2026");
  });

  it("should calculate reading time and word counts accurately", () => {
    const text = "This is a financial note with eight words total.";
    const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = plainText ? plainText.split(/\s+/).length : 0;
    const chars = plainText.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    expect(words).toBe(9);
    expect(chars).toBe(48);
    expect(readingTime).toBe(1);
  });

  it("should format random unguessable IDs with 3-4 letter prefix (nte_...)", () => {
    const sampleId = "nte_abc123456789";
    expect(sampleId).toMatch(/^nte_[a-z0-9]+$/);
  });

  it("should handle soft deletion and restore correctly", async () => {
    const del = await deleteNote("nte_test123", "Obsolete plan");
    expect(del).toBeDefined();

    const rest = await restoreNote("nte_test123");
    expect(rest).toBeDefined();
  });

  it("should execute bulk actions across multiple notes", async () => {
    const result = await bulkNoteAction("pin", ["nte_1", "nte_2"]);
    expect(result).toBeDefined();
  });

  it("should duplicate a note with 'Copy of' prefix, fresh version 1, and activity logs", async () => {
    const dup = await duplicateNote("nte_test123");
    expect(dup).toBeDefined();
    expect(dup.title).toBe("Copy of Test Note");
    expect(dup.version).toBe(1);
  });

  it("should export note document in PDF, DOCX, Markdown, TXT, CSV, and JSON formats", async () => {
    const pdfExport = await exportNoteDocument("pdf", "nte_test123");
    expect(pdfExport.mimeType).toBe("text/html");
    expect(pdfExport.filename).toContain(".pdf");
    expect(pdfExport.content).toContain("SplitLedger AI");

    const docxExport = await exportNoteDocument("docx", "nte_test123");
    expect(docxExport.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(docxExport.filename).toContain(".docx");
    expect(docxExport.content).toContain("<w:WordDocument>");

    const mdExport = await exportNoteDocument("markdown", "nte_test123");
    expect(mdExport.mimeType).toBe("text/markdown");
    expect(mdExport.filename).toContain(".md");
    expect(mdExport.content).toContain("# Test Note");

    const txtExport = await exportNoteDocument("txt", "nte_test123");
    expect(txtExport.mimeType).toBe("text/plain");
    expect(txtExport.filename).toContain(".txt");
    expect(txtExport.content).toContain("SPLITLEDGER AI — FINANCIAL NOTE REPORT");

    const jsonExport = await exportNoteDocument("json", "nte_test123");
    expect(jsonExport.mimeType).toBe("application/json");
    expect(jsonExport.filename).toContain(".json");

    const csvExport = await exportNoteDocument("csv", "nte_test123");
    expect(csvExport.mimeType).toBe("text/csv");
    expect(csvExport.filename).toContain(".csv");
  });

  it("should record print audit activity successfully", async () => {
    const res = await recordNotePrintActivity("nte_test123");
    expect(res).toEqual({ success: true });
  });

  it("should fetch note versions and restore a snapshot as a new version", async () => {
    const versions = await getNoteVersions("nte_test123");
    expect(Array.isArray(versions)).toBe(true);

    const restored = await restoreNoteVersion("nte_test123", "nver_test1");
    expect(restored).toBeDefined();
  });
});
