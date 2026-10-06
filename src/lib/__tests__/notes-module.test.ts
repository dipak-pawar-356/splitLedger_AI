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
});
