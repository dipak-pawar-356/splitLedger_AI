import { describe, it, expect, vi } from "vitest";
import {
  linkNoteToEntity,
  unlinkNoteFromEntity,
  getLinkedNotesForEntity,
  getDailyFinancialJournal,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  createNoteReminder,
  deleteNoteReminder,
  createNoteAttachment,
  deleteNoteAttachment,
  addNoteComment,
  getNoteComments,
  getNoteActivityLog,
  exportNoteDocument,
} from "@/actions/notes";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 1, email: "test@example.com", name: "Test User" }),
}));

const sampleRecord = {
  id: 1,
  publicId: "nte_test123",
  userId: 1,
  title: "Test Note",
  content: "<p>Test Content</p>",
  plainText: "Test Content",
  wordCount: 2,
  characterCount: 12,
  readingTime: 1,
  version: 1,
  createdAt: new Date("2026-09-01T10:00:00Z"),
  updatedAt: new Date("2026-09-01T10:00:00Z"),
  categoryName: "General",
  categoryColor: "#6366f1",
  entityType: "transaction",
  entityId: 101,
  entityPublicId: "tx_101",
  notePublicId: "nte_test123",
  noteTitle: "Test Note",
  date: "2026-09-01",
  amount: 5000,
  type: "expense",
  isCompleted: false,
};

function createSelectChain(data: any = [sampleRecord]) {
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
    groupBy: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  return chain;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => createSelectChain([sampleRecord])),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            publicId: "nlk_123",
            noteId: 1,
            entityType: "transaction",
            entityId: 101,
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              isCompleted: true,
            },
          ]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ success: true }),
    }),
  },
  withDbRetry: vi.fn().mockImplementation((cb) => cb()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Notes Integration Engine (Part III & Part IV)", () => {
  it("should link note to a financial transaction entity", async () => {
    const link = await linkNoteToEntity({
      notePublicId: "nte_test123",
      entityType: "transaction",
      entityId: 101,
      entityPublicId: "tx_101",
    });

    expect(link).toBeDefined();
    expect(link.entityType).toBe("transaction");
  });

  it("should fetch linked notes for a given financial entity", async () => {
    const links = await getLinkedNotesForEntity("transaction", 101);
    expect(links).toBeDefined();
    expect(Array.isArray(links)).toBe(true);
  });

  it("should compute daily financial journal stats", async () => {
    const journal = await getDailyFinancialJournal("2026-09-01");
    expect(journal).toBeDefined();
    expect(journal.date).toBe("2026-09-01");
    expect(typeof journal.income).toBe("number");
    expect(typeof journal.expense).toBe("number");
  });

  it("should create checklist item for a note", async () => {
    const item = await createChecklistItem("nte_test123", {
      title: "Buy groceries for trip",
      priority: "high",
    });

    expect(item).toBeDefined();
  });

  it("should toggle checklist item completion", async () => {
    const updated = await toggleChecklistItem("nchk_123", true);
    expect(updated).toBeDefined();
  });

  it("should generate document export in JSON format", async () => {
    const exp = await exportNoteDocument("json", "nte_test123");
    expect(exp.mimeType).toBe("application/json");
    expect(exp.filename).toContain("SplitLedger_AI");
  });

  it("should generate document export in TXT format", async () => {
    const exp = await exportNoteDocument("txt", "nte_test123");
    expect(exp.mimeType).toBe("text/plain");
    expect(exp.content).toContain("# Test Note");
  });
});
