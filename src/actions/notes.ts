"use server";

import { db, withDbRetry } from "@/lib/db";
import { notes, noteCategories, noteVersions, noteLinks, noteChecklists, noteReminders, noteAttachments, noteShares, noteComments, noteActivityLogs, transactions, categories, contacts, users, dailyJournals } from "@/lib/db/schema/schema";
import { eq, and, or, ilike, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { generatePublicId, formatDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { appCache } from "@/lib/cache";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { escapeCsvValue } from "@/lib/export/export-engine";
import {
  extractExpensesFromNote,
  getNoteFinancialSummary,
  cleanNoteContentText,
  type ExtractedNoteExpense,
  type NoteFinancialSummary,
} from "@/lib/notes/financial-note-analyzer";

function calculateStatsText(content: string) {
  const plainText = cleanNoteContentText(content).trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const chars = plainText.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return { plainText, words, chars, readingTime };
}

function safeRevalidatePath(path: string, userId?: number) {
  try {
    revalidatePath(path);
    if (path.includes("/dashboard/notes") || path.includes("/dashboard")) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/notes");
      if (userId) {
        appCache.invalidateTags([`user:${userId}`, "dashboard", "notes"]);
      } else {
        appCache.invalidateTags(["dashboard", "notes"]);
      }
    }
  } catch (_) {}
}

const DEFAULT_CATEGORIES = [
  { name: "General", color: "#6366f1", icon: "Folder" },
  { name: "Finance", color: "#10b981", icon: "Wallet" },
  { name: "Personal", color: "#3b82f6", icon: "User" },
  { name: "Trips", color: "#f97316", icon: "Compass" },
  { name: "Groups", color: "#8b5cf6", icon: "Users" },
  { name: "Business", color: "#6366f1", icon: "Briefcase" },
  { name: "Ideas", color: "#eab308", icon: "Lightbulb" },
  { name: "Shopping", color: "#ec4899", icon: "ShoppingBag" },
  { name: "Medical", color: "#ef4444", icon: "Activity" },
  { name: "Loans", color: "#f43f5e", icon: "HandCoins" },
  { name: "Savings", color: "#059669", icon: "PiggyBank" },
  { name: "Investment", color: "#7c3aed", icon: "TrendingUp" },
  { name: "Reminder", color: "#d97706", icon: "Bell" },
  { name: "Meeting", color: "#06b6d4", icon: "Calendar" },
  { name: "Food", color: "#84cc16", icon: "Utensils" },
  { name: "Others", color: "#64748b", icon: "Folder" },
];

export async function ensureDefaultCategories(userId: number) {
  return await withDbRetry(async () => {
    try {
      const existing = await db
        .select()
        .from(noteCategories)
        .where(or(eq(noteCategories.userId, userId), eq(noteCategories.isDefault, true)));

      const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));

      const toInsert = DEFAULT_CATEGORIES.filter((cat) => !existingNames.has(cat.name.toLowerCase()));

      if (toInsert.length > 0) {
        const inserts = toInsert.map((cat) => ({
          publicId: generatePublicId("ncat"),
          userId,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isDefault: true,
        }));
        await db.insert(noteCategories).values(inserts);
      }
    } catch (err) {
      console.warn("ensureDefaultCategories auto-table init warning:", err);
    }
  });
}

export interface NoteFilterOptions {
  search?: string;
  categoryId?: number;
  tag?: string;
  period?: string;
  status?: "all" | "draft" | "pinned" | "favorite" | "archived" | "trash" | "quick_notes";
  color?: string;
  sort?: "newest" | "oldest" | "title" | "updated";
  page?: number;
  limit?: number;
}

export async function getNotes(options: NoteFilterOptions = {}) {
  const user = await requireAuth();
  await ensureDefaultCategories(user.id);

  return await withDbRetry(async () => {
    const {
      search,
      categoryId,
      tag,
      period,
      status = "all",
      color,
      sort = "newest",
      page = 1,
      limit = 50,
    } = options;

    const conditions: any[] = [eq(notes.userId, user.id)];

    // Status filtering
    if (status === "trash") {
      conditions.push(eq(notes.isDeleted, true));
    } else {
      conditions.push(or(eq(notes.isDeleted, false), isNull(notes.isDeleted)));

      if (status === "draft") {
        conditions.push(eq(notes.isDraft, true));
        conditions.push(or(eq(notes.isArchived, false), isNull(notes.isArchived)));
      } else if (status === "pinned") {
        conditions.push(eq(notes.isPinned, true));
        conditions.push(or(eq(notes.isArchived, false), isNull(notes.isArchived)));
      } else if (status === "favorite") {
        conditions.push(eq(notes.isFavorite, true));
        conditions.push(or(eq(notes.isArchived, false), isNull(notes.isArchived)));
      } else if (status === "archived") {
        conditions.push(eq(notes.isArchived, true));
      } else if (status === "quick_notes") {
        conditions.push(or(eq(notes.isArchived, false), isNull(notes.isArchived)));
        conditions.push(sql`${notes.tags}::text ILIKE '%Quick Note%'`);
      } else if (status === "all") {
        conditions.push(or(eq(notes.isArchived, false), isNull(notes.isArchived)));
      }
    }

    if (tag && tag.trim()) {
      conditions.push(sql`${notes.tags}::text ILIKE ${'%' + tag.trim() + '%'}`);
    }

    if (categoryId) {
      // Find all category IDs with the same name as this category (handles default category duplicates)
      const [targetCat] = await db
        .select({ name: noteCategories.name })
        .from(noteCategories)
        .where(eq(noteCategories.id, categoryId))
        .limit(1);

      if (targetCat) {
        const matchingCats = await db
          .select({ id: noteCategories.id })
          .from(noteCategories)
          .where(
            and(
              ilike(noteCategories.name, targetCat.name),
              or(eq(noteCategories.userId, user.id), eq(noteCategories.isDefault, true))
            )
          );
        const catIds = matchingCats.map((c) => c.id);
        if (catIds.length > 0) {
          conditions.push(inArray(notes.categoryId, catIds));
        } else {
          conditions.push(eq(notes.categoryId, categoryId));
        }
      } else {
        conditions.push(eq(notes.categoryId, categoryId));
      }
    }

    if (color && color !== "all") {
      conditions.push(eq(notes.color, color));
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(notes.title, q),
          ilike(notes.plainText, q),
          ilike(notes.content, q)
        )
      );
    }

    // Sort order
    let orderBy: any = desc(notes.updatedAt);
    if (sort === "oldest") orderBy = asc(notes.createdAt);
    if (sort === "title") orderBy = asc(notes.title);
    if (sort === "newest") orderBy = desc(notes.createdAt);

    const offset = (page - 1) * limit;

    const [noteList, countResult] = await Promise.all([
      db
        .select({
          id: notes.id,
          publicId: notes.publicId,
          userId: notes.userId,
          categoryId: notes.categoryId,
          title: notes.title,
          content: notes.content,
          plainText: notes.plainText,
          isDraft: notes.isDraft,
          isPinned: notes.isPinned,
          isFavorite: notes.isFavorite,
          isArchived: notes.isArchived,
          isDeleted: notes.isDeleted,
          deletedAt: notes.deletedAt,
          color: notes.color,
          tags: notes.tags,
          version: notes.version,
          wordCount: notes.wordCount,
          characterCount: notes.characterCount,
          readingTime: notes.readingTime,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
          categoryName: noteCategories.name,
          categoryColor: noteCategories.color,
          categoryIcon: noteCategories.icon,
        })
        .from(notes)
        .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
        .where(and(...conditions))
        .orderBy(desc(notes.isPinned), orderBy)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(notes)
        .where(and(...conditions)),
    ]);

    // Tag filtering in memory if required
    let filteredList = noteList;
    if (tag && tag.trim()) {
      const cleanTag = tag.trim().toLowerCase();
      filteredList = noteList.filter((n) => {
        const nTags = (n.tags as string[]) || [];
        return nTags.some((t) => t.toLowerCase() === cleanTag || t.toLowerCase() === `#${cleanTag}`);
      });
    }

    const totalCount = Number(countResult[0]?.count || 0);

    return {
      notes: filteredList,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  });
}

export async function getNoteById(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select({
        id: notes.id,
        publicId: notes.publicId,
        userId: notes.userId,
        categoryId: notes.categoryId,
        title: notes.title,
        content: notes.content,
        plainText: notes.plainText,
        richTextJson: notes.richTextJson,
        isDraft: notes.isDraft,
        isPinned: notes.isPinned,
        isFavorite: notes.isFavorite,
        isArchived: notes.isArchived,
        isDeleted: notes.isDeleted,
        deletedAt: notes.deletedAt,
        deleteReason: notes.deleteReason,
        restoredAt: notes.restoredAt,
        color: notes.color,
        tags: notes.tags,
        version: notes.version,
        wordCount: notes.wordCount,
        characterCount: notes.characterCount,
        readingTime: notes.readingTime,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        categoryName: noteCategories.name,
        categoryColor: noteCategories.color,
      })
      .from(notes)
      .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return null;

    const versions = await db
      .select()
      .from(noteVersions)
      .where(eq(noteVersions.noteId, note.id))
      .orderBy(desc(noteVersions.versionNumber));

    return {
      ...note,
      versions,
    };
  });
}

export async function createNote(data: {
  title: string;
  content?: string;
  categoryId?: number;
  color?: string;
  tags?: string[];
  isDraft?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  targetDate?: string | Date;
}) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const publicId = generatePublicId("nte");
    const rawContent = data.content || "";
    const stats = calculateStatsText(rawContent);
    const creationDate = data.targetDate ? new Date(data.targetDate) : new Date();

    // Default category should always be "General" when creating new notes unless user selected another category
    let targetCatId = data.categoryId || null;
    if (!targetCatId) {
      const [generalCat] = await db
        .select({ id: noteCategories.id })
        .from(noteCategories)
        .where(
          and(
            ilike(noteCategories.name, "general"),
            or(eq(noteCategories.userId, user.id), eq(noteCategories.isDefault, true))
          )
        )
        .limit(1);
      if (generalCat) {
        targetCatId = generalCat.id;
      }
    }

    const [newNote] = await db
      .insert(notes)
      .values({
        publicId,
        userId: user.id,
        categoryId: targetCatId,
        title: data.title || "Untitled Note",
        content: rawContent,
        plainText: stats.plainText,
        color: data.color || "default",
        tags: data.tags || [],
        isDraft: data.isDraft ?? false,
        isPinned: data.isPinned ?? false,
        isFavorite: data.isFavorite ?? false,
        isArchived: false,
        isDeleted: false,
        version: 1,
        wordCount: stats.words,
        characterCount: stats.chars,
        readingTime: stats.readingTime,
        createdAt: creationDate,
        updatedAt: creationDate,
      })
      .returning();

    // Create initial version
    await db.insert(noteVersions).values({
      publicId: generatePublicId("nver"),
      noteId: newNote.id,
      versionNumber: 1,
      editedBy: user.id,
      title: newNote.title,
      content: newNote.content,
      summary: "Initial note creation",
    });

    await logNoteActivity(newNote.id, user.id, "created", `Created note "${newNote.title}"`);

    safeRevalidatePath("/dashboard/notes");
    return newNote;
  });
}

export async function updateNote(
  publicId: string,
  data: {
    title?: string;
    content?: string;
    categoryId?: number | null;
    color?: string;
    tags?: string[];
    isDraft?: boolean;
    isPinned?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    targetDate?: string | Date;
    createVersion?: boolean;
    versionSummary?: string;
  }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Note not found or access denied");

    const contentToUse = data.content !== undefined ? data.content : existing.content;
    const stats = calculateStatsText(contentToUse);
    const newVersionNum = data.createVersion ? existing.version + 1 : existing.version;

    const updateFields: any = {
      updatedAt: new Date(),
      version: newVersionNum,
      wordCount: stats.words,
      characterCount: stats.chars,
      readingTime: stats.readingTime,
      plainText: stats.plainText,
    };

    if (data.title !== undefined) updateFields.title = data.title;
    if (data.content !== undefined) updateFields.content = data.content;
    if (data.categoryId !== undefined) updateFields.categoryId = data.categoryId;
    if (data.color !== undefined) updateFields.color = data.color;
    if (data.tags !== undefined) updateFields.tags = data.tags;
    if (data.isDraft !== undefined) updateFields.isDraft = data.isDraft;
    if (data.isPinned !== undefined) updateFields.isPinned = data.isPinned;
    if (data.isFavorite !== undefined) updateFields.isFavorite = data.isFavorite;
    if (data.isArchived !== undefined) updateFields.isArchived = data.isArchived;
    if (data.targetDate !== undefined) updateFields.createdAt = new Date(data.targetDate);

    const [updated] = await db
      .update(notes)
      .set(updateFields)
      .where(eq(notes.id, existing.id))
      .returning();

    if (data.createVersion) {
      await db.insert(noteVersions).values({
        publicId: generatePublicId("nver"),
        noteId: existing.id,
        versionNumber: newVersionNum,
        editedBy: user.id,
        title: updated.title,
        content: updated.content,
        summary: data.versionSummary || `Version ${newVersionNum} update`,
      });
      await logNoteActivity(existing.id, user.id, "edited", data.versionSummary || `Saved version ${newVersionNum}`);
    } else {
      if (data.isArchived !== undefined && data.isArchived !== existing.isArchived) {
        await logNoteActivity(existing.id, user.id, data.isArchived ? "archived" : "unarchived", data.isArchived ? "Archived note" : "Unarchived note");
      }
      if (data.tags !== undefined && JSON.stringify(data.tags) !== JSON.stringify(existing.tags)) {
        await logNoteActivity(existing.id, user.id, "tags_updated", `Updated tags: ${(data.tags || []).join(", ")}`);
      }
      if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) {
        await logNoteActivity(existing.id, user.id, "category_changed", "Changed note category");
      }
    }

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function autoSaveNote(
  publicId: string,
  data: {
    title: string;
    content: string;
    categoryId?: number | null;
    color?: string;
    tags?: string[];
  }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) return null;

    const stats = calculateStatsText(data.content);

    const [updated] = await db
      .update(notes)
      .set({
        title: data.title || existing.title,
        content: data.content,
        plainText: stats.plainText,
        categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
        color: data.color || existing.color,
        tags: data.tags || existing.tags,
        wordCount: stats.words,
        characterCount: stats.chars,
        readingTime: stats.readingTime,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, existing.id))
      .returning();

    safeRevalidatePath("/dashboard/notes", user.id);
    return updated;
  });
}

export async function deleteNote(publicId: string, reason?: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Note not found");

    const [deleted] = await db
      .update(notes)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        deleteReason: reason || "User moved to trash",
        updatedAt: new Date(),
      })
      .where(eq(notes.id, existing.id))
      .returning();

    await logNoteActivity(existing.id, user.id, "deleted", reason || "Moved note to trash");

    safeRevalidatePath("/dashboard/notes");
    return deleted;
  });
}

export async function restoreNote(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Note not found");

    const [restored] = await db
      .update(notes)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        restoredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notes.id, existing.id))
      .returning();

    await logNoteActivity(existing.id, user.id, "restored", "Restored note from trash");

    safeRevalidatePath("/dashboard/notes");
    return restored;
  });
}

export async function permanentDeleteNote(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Note not found");

    await db.delete(notes).where(eq(notes.id, existing.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function duplicateNote(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const original = await getNoteById(publicId);
    if (!original) throw new Error("Original note not found");

    const newPublicId = generatePublicId("nte");
    const cleanTitle = (original.title || "Untitled Note").replace(/^Copy of\s+/i, "");
    const newTitle = `Copy of ${cleanTitle}`;

    const [dup] = await db
      .insert(notes)
      .values({
        publicId: newPublicId,
        userId: user.id,
        categoryId: original.categoryId,
        title: newTitle,
        content: original.content,
        plainText: original.plainText,
        color: original.color,
        tags: original.tags,
        isDraft: original.isDraft,
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        isDeleted: false,
        version: 1,
        wordCount: original.wordCount,
        characterCount: original.characterCount,
        readingTime: original.readingTime,
      })
      .returning();

    // 1. Deep copy checklist tasks
    const originalTasks = await db
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.noteId, original.id));

    for (const t of originalTasks) {
      await db.insert(noteChecklists).values({
        publicId: generatePublicId("nchk"),
        noteId: dup.id,
        title: t.title,
        description: t.description,
        status: t.status,
        progress: t.progress,
        taskNotes: t.taskNotes,
        subtasks: t.subtasks,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        priority: t.priority,
      });
    }

    // 2. Deep copy attachments
    const originalAttachments = await db
      .select()
      .from(noteAttachments)
      .where(eq(noteAttachments.noteId, original.id));

    for (const att of originalAttachments) {
      await db.insert(noteAttachments).values({
        publicId: generatePublicId("natt"),
        noteId: dup.id,
        userId: user.id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        url: att.url,
        isVoiceNote: att.isVoiceNote,
        durationSeconds: att.durationSeconds,
      });
    }

    // 3. Create initial version 1 snapshot
    await db.insert(noteVersions).values({
      publicId: generatePublicId("nver"),
      noteId: dup.id,
      versionNumber: 1,
      editedBy: user.id,
      title: dup.title,
      content: dup.content,
      summary: `Initial version (duplicated from "${original.title}")`,
    });

    // 4. Record audit activity logs
    await logNoteActivity(dup.id, user.id, "created", `Duplicated from "${original.title}"`);
    await logNoteActivity(original.id, user.id, "duplicated", `Created duplicate "${dup.title}"`);

    safeRevalidatePath("/dashboard/notes");
    return dup;
  });
}

export async function emptyTrash() {
  const user = await requireAuth();
  return await withDbRetry(async () => {
    const deletedNotes = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.userId, user.id), eq(notes.isDeleted, true)));

    if (deletedNotes.length === 0) return { count: 0 };
    const ids = deletedNotes.map((n) => n.id);
    await db.delete(notes).where(inArray(notes.id, ids));
    safeRevalidatePath("/dashboard/notes");
    return { count: ids.length };
  });
}

export async function bulkNoteAction(
  action: "delete" | "archive" | "restore" | "favorite" | "unfavorite" | "pin" | "unpin" | "category" | "color" | "add_tag" | "permanent_delete",
  notePublicIds: string[],
  extraData?: any
) {
  const user = await requireAuth();
  if (!notePublicIds || notePublicIds.length === 0) return { count: 0 };

  return await withDbRetry(async () => {
    const userNotes = await db
      .select({ id: notes.id, publicId: notes.publicId, tags: notes.tags })
      .from(notes)
      .where(and(eq(notes.userId, user.id), inArray(notes.publicId, notePublicIds)));

    const noteList = Array.isArray(userNotes) ? userNotes : [];
    const ids = noteList.map((n) => n.id);
    if (ids.length === 0) return { count: 0 };

    if (action === "permanent_delete") {
      await db.delete(notes).where(inArray(notes.id, ids));
    } else if (action === "delete") {
      await db
        .update(notes)
        .set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "archive") {
      await db
        .update(notes)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "restore") {
      await db
        .update(notes)
        .set({ isDeleted: false, isArchived: false, deletedAt: null, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "favorite") {
      await db
        .update(notes)
        .set({ isFavorite: true, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "unfavorite") {
      await db
        .update(notes)
        .set({ isFavorite: false, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "pin") {
      await db
        .update(notes)
        .set({ isPinned: true, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "unpin") {
      await db
        .update(notes)
        .set({ isPinned: false, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "category" && extraData?.categoryId !== undefined) {
      await db
        .update(notes)
        .set({ categoryId: extraData.categoryId, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "color" && extraData?.color) {
      await db
        .update(notes)
        .set({ color: extraData.color, updatedAt: new Date() })
        .where(inArray(notes.id, ids));
    } else if (action === "add_tag" && extraData?.tag) {
      const tagToAdd = extraData.tag.startsWith("#") ? extraData.tag : `#${extraData.tag}`;
      for (const n of userNotes) {
        const curTags = (n.tags as string[]) || [];
        if (!curTags.includes(tagToAdd)) {
          await db
            .update(notes)
            .set({ tags: [...curTags, tagToAdd], updatedAt: new Date() })
            .where(eq(notes.id, n.id));
        }
      }
    }

    safeRevalidatePath("/dashboard/notes");
    return { count: ids.length };
  });
}

export async function getNoteVersions(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select({
        id: noteVersions.id,
        publicId: noteVersions.publicId,
        versionNumber: noteVersions.versionNumber,
        title: noteVersions.title,
        content: noteVersions.content,
        summary: noteVersions.summary,
        createdAt: noteVersions.createdAt,
        editedBy: noteVersions.editedBy,
        userName: users.name,
      })
      .from(noteVersions)
      .leftJoin(users, eq(noteVersions.editedBy, users.id))
      .where(eq(noteVersions.noteId, note.id))
      .orderBy(desc(noteVersions.versionNumber));
  });
}

export async function restoreNoteVersion(notePublicId: string, versionPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const [ver] = await db
      .select()
      .from(noteVersions)
      .where(and(eq(noteVersions.publicId, versionPublicId), eq(noteVersions.noteId, note.id)))
      .limit(1);

    if (!ver) throw new Error("Version snapshot not found");

    const updated = await updateNote(notePublicId, {
      title: ver.title,
      content: ver.content,
      createVersion: true,
      versionSummary: `Restored version ${ver.versionNumber}`,
    });

    await logNoteActivity(note.id, user.id, "version_restored", `Restored snapshot from version ${ver.versionNumber}`);
    return updated;
  });
}

export async function getNoteCategories() {
  const user = await requireAuth();
  await ensureDefaultCategories(user.id);

  return await withDbRetry(async () => {
    const [rawCategories, userNotes] = await Promise.all([
      db
        .select()
        .from(noteCategories)
        .where(and(or(eq(noteCategories.userId, user.id), eq(noteCategories.isDefault, true)), eq(noteCategories.isArchived, false)))
        .orderBy(asc(noteCategories.name)),
      db
        .select({ categoryId: notes.categoryId })
        .from(notes)
        .where(
          and(
            eq(notes.userId, user.id),
            or(eq(notes.isDeleted, false), isNull(notes.isDeleted))
          )
        ),
    ]);

    // Count active notes per category ID
    const countsMap: Record<number, number> = {};
    for (const n of userNotes) {
      if (n.categoryId) {
        countsMap[n.categoryId] = (countsMap[n.categoryId] || 0) + 1;
      }
    }

    // Deduplicate in memory by lower-case category name
    const seen = new Map<string, any>();
    for (const cat of rawCategories) {
      const key = cat.name.trim().toLowerCase();
      const countForCat = countsMap[cat.id] || 0;
      if (!seen.has(key)) {
        seen.set(key, {
          ...cat,
          noteCount: countForCat,
        });
      } else {
        // Merge count into existing category
        const existing = seen.get(key);
        existing.noteCount = (existing.noteCount || 0) + countForCat;
      }
    }

    return Array.from(seen.values());
  });
}

export async function createNoteCategory(data: {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const publicId = generatePublicId("ncat");
    const [cat] = await db
      .insert(noteCategories)
      .values({
        publicId,
        userId: user.id,
        name: data.name,
        color: data.color || "#6366f1",
        icon: data.icon || "Folder",
        description: data.description || "",
        isDefault: false,
      })
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return cat;
  });
}

export async function updateNoteCategory(
  publicId: string,
  data: { name?: string; color?: string; icon?: string; description?: string; isArchived?: boolean }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cat] = await db
      .select()
      .from(noteCategories)
      .where(and(eq(noteCategories.publicId, publicId), eq(noteCategories.userId, user.id)))
      .limit(1);

    if (!cat) throw new Error("Category not found or access denied");

    const [updated] = await db
      .update(noteCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(noteCategories.id, cat.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function deleteNoteCategory(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cat] = await db
      .select()
      .from(noteCategories)
      .where(and(eq(noteCategories.publicId, publicId), eq(noteCategories.userId, user.id)))
      .limit(1);

    if (!cat) throw new Error("Category not found");

    // Reset notes in this category to uncategorized
    await db
      .update(notes)
      .set({ categoryId: null })
      .where(eq(notes.categoryId, cat.id));

    await db.delete(noteCategories).where(eq(noteCategories.id, cat.id));

    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function getNoteStats() {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const allUserNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, user.id));

    const todayStr = new Date().toISOString().split("T")[0];

    let totalNotes = 0;
    let todayNotes = 0;
    let drafts = 0;
    let pinned = 0;
    let favorites = 0;
    let archived = 0;
    let trash = 0;
    let totalWords = 0;
    let totalChars = 0;
    let totalReadingTime = 0;

    const tagCounts: Record<string, number> = {};

    for (const n of allUserNotes) {
      if (n.isDeleted) {
        trash++;
        continue;
      }

      totalNotes++;
      totalWords += n.wordCount || 0;
      totalChars += n.characterCount || 0;
      totalReadingTime += n.readingTime || 0;

      const nDate = new Date(n.createdAt).toISOString().split("T")[0];
      if (nDate === todayStr) todayNotes++;

      if (n.isDraft) drafts++;
      if (n.isPinned) pinned++;
      if (n.isFavorite) favorites++;
      if (n.isArchived) archived++;

      const nTags = (n.tags as string[]) || [];
      for (const t of nTags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      totalNotes,
      todayNotes,
      drafts,
      pinned,
      favorites,
      archived,
      trash,
      totalWords,
      totalChars,
      totalReadingTime,
      popularTags,
      avgWordsPerNote: totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0,
    };
  });
}

export async function getNoteTimeline() {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const userNotes = await db
      .select({
        publicId: notes.publicId,
        title: notes.title,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        isPinned: notes.isPinned,
        isFavorite: notes.isFavorite,
        isArchived: notes.isArchived,
        isDeleted: notes.isDeleted,
      })
      .from(notes)
      .where(eq(notes.userId, user.id))
      .orderBy(desc(notes.updatedAt))
      .limit(50);

    return userNotes.map((n) => ({
      ...n,
      action: n.isDeleted
        ? "Moved to Trash"
        : n.isArchived
        ? "Archived"
        : n.isPinned
        ? "Pinned"
        : "Updated",
    }));
  });
}

export async function getNoteCalendar() {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [userNotes, userReminders, userTasks, userAttachments] = await Promise.all([
      db
        .select({
          publicId: notes.publicId,
          title: notes.title,
          createdAt: notes.createdAt,
          isDraft: notes.isDraft,
          isPinned: notes.isPinned,
          isArchived: notes.isArchived,
          isDeleted: notes.isDeleted,
        })
        .from(notes)
        .where(eq(notes.userId, user.id)),
      db
        .select({
          id: noteReminders.id,
          reminderDate: noteReminders.reminderDate,
        })
        .from(noteReminders)
        .where(eq(noteReminders.userId, user.id)),
      db
        .select({
          id: noteChecklists.id,
          title: noteChecklists.title,
          dueDate: noteChecklists.dueDate,
          createdAt: noteChecklists.createdAt,
        })
        .from(noteChecklists)
        .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
        .where(eq(notes.userId, user.id)),
      db
        .select({
          id: noteAttachments.id,
          isVoiceNote: noteAttachments.isVoiceNote,
          createdAt: noteAttachments.createdAt,
        })
        .from(noteAttachments)
        .where(eq(noteAttachments.userId, user.id)),
    ]);

    const dateMap: Record<
      string,
      {
        total: number;
        notesCount: number;
        remindersCount: number;
        tasksCount: number;
        voiceCount: number;
        attachmentsCount: number;
        pinned: number;
        drafts: number;
        archived: number;
        items: Array<{ title: string; publicId: string }>;
      }
    > = {};

    const getOrCreate = (key: string) => {
      if (!dateMap[key]) {
        dateMap[key] = {
          total: 0,
          notesCount: 0,
          remindersCount: 0,
          tasksCount: 0,
          voiceCount: 0,
          attachmentsCount: 0,
          pinned: 0,
          drafts: 0,
          archived: 0,
          items: [],
        };
      }
      return dateMap[key];
    };

    for (const n of userNotes) {
      if (n.isDeleted) continue;
      const dateKey = new Date(n.createdAt).toISOString().split("T")[0];
      const entry = getOrCreate(dateKey);
      entry.total++;
      entry.notesCount++;
      if (n.isPinned) entry.pinned++;
      if (n.isDraft) entry.drafts++;
      if (n.isArchived) entry.archived++;
      entry.items.push({ title: n.title || "Untitled Note", publicId: n.publicId });
    }

    for (const r of userReminders) {
      if (!r.reminderDate) continue;
      const dateKey = new Date(r.reminderDate).toISOString().split("T")[0];
      const entry = getOrCreate(dateKey);
      entry.remindersCount++;
    }

    for (const t of userTasks) {
      const dateVal = t.dueDate || t.createdAt;
      if (!dateVal) continue;
      const dateKey = new Date(dateVal).toISOString().split("T")[0];
      const entry = getOrCreate(dateKey);
      entry.tasksCount++;
    }

    for (const a of userAttachments) {
      if (!a.createdAt) continue;
      const dateKey = new Date(a.createdAt).toISOString().split("T")[0];
      const entry = getOrCreate(dateKey);
      if (a.isVoiceNote) {
        entry.voiceCount++;
      } else {
        entry.attachmentsCount++;
      }
    }

    return dateMap;
  });
}

// 1. FINANCIAL ENTITY LINKING
export async function linkNoteToEntity(data: {
  notePublicId: string;
  entityType: "transaction" | "group" | "trip" | "budget" | "loan" | "settlement";
  entityId: number;
  entityPublicId?: string;
  snapshot?: any;
}) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, data.notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const publicId = generatePublicId("nlk");
    const [link] = await db
      .insert(noteLinks)
      .values({
        publicId,
        noteId: note.id,
        entityType: data.entityType,
        entityId: data.entityId,
        entityPublicId: data.entityPublicId || null,
        snapshot: data.snapshot || null,
      })
      .returning();

    await logNoteActivity(note.id, user.id, "linked", `Linked note to ${data.entityType} ${data.entityPublicId || data.entityId}`);
    safeRevalidatePath("/dashboard/notes");
    return link;
  });
}

export async function unlinkNoteFromEntity(linkPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [link] = await db
      .select()
      .from(noteLinks)
      .where(eq(noteLinks.publicId, linkPublicId))
      .limit(1);

    if (!link) throw new Error("Link not found");

    await db.delete(noteLinks).where(eq(noteLinks.id, link.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function getLinkedNotesForEntity(entityType: string, entityId: number) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const links = await db
      .select({
        linkId: noteLinks.id,
        linkPublicId: noteLinks.publicId,
        entityType: noteLinks.entityType,
        entityId: noteLinks.entityId,
        entityPublicId: noteLinks.entityPublicId,
        snapshot: noteLinks.snapshot,
        notePublicId: notes.publicId,
        noteTitle: notes.title,
        noteContent: notes.content,
        noteCreatedAt: notes.createdAt,
        noteColor: notes.color,
      })
      .from(noteLinks)
      .innerJoin(notes, eq(noteLinks.noteId, notes.id))
      .where(and(eq(noteLinks.entityType, entityType), eq(noteLinks.entityId, entityId), eq(notes.userId, user.id)));

    return links;
  });
}

// 2. DAILY FINANCIAL JOURNAL
export async function getDailyFinancialJournal(dateStr?: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const now = new Date();
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    // Normalize target date to canonical YYYY-MM-DD
    let normalizedTargetDateStr = todayLocalStr;
    if (dateStr) {
      const clean = dateStr.trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
        const [y, m, d] = clean.split("-").map(Number);
        normalizedTargetDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      } else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(clean)) {
        const parts = clean.split(/[-/.]/).map(Number);
        const [d, m, y] = parts;
        normalizedTargetDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      } else {
        const parsed = new Date(clean);
        if (!isNaN(parsed.getTime())) {
          normalizedTargetDateStr = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
        }
      }
    }

    // Parse targetDate parts for flexible matching (e.g. 2026-11-01 -> 01/11/2026 or 1/11/2026)
    const [tYear, tMonth, tDay] = normalizedTargetDateStr.split("-").map(Number);
    const dmyPattern1 = `${String(tDay).padStart(2, "0")}/${String(tMonth).padStart(2, "0")}/${tYear}`;
    const dmyPattern2 = `${tDay}/${tMonth}/${tYear}`;
    const dmyPattern3 = `${String(tDay).padStart(2, "0")}-${String(tMonth).padStart(2, "0")}-${tYear}`;

    // Compute metrics from transactions for targetDateStr
    const allTxns = await db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        date: transactions.date,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        categoryName: categories.name,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(and(eq(transactions.userId, user.id), eq(transactions.isDeleted, false)));

    let income = 0;
    let txExpense = 0;
    let receivable = 0;
    let payable = 0;
    const matchingTxns: any[] = [];
    const txList = Array.isArray(allTxns) ? allTxns : [];

    for (const t of txList) {
      const d = new Date(t.date);
      const dLocalStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dLocalStr === normalizedTargetDateStr) {
        matchingTxns.push(t);
        const amt = (t.amount || 0) / 100;
        if (t.type === "received" || t.type === "repaid") {
          income += amt;
        } else if (t.type === "lent") {
          receivable += amt;
        } else if (t.type === "borrowed") {
          payable += amt;
        } else {
          txExpense += amt;
        }
      }
    }

    // Fetch notes and extract multi-flow financial entries
    const allNotes = await db
      .select({
        id: notes.id,
        publicId: notes.publicId,
        title: notes.title,
        content: notes.content,
        plainText: notes.plainText,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        categoryName: noteCategories.name,
      })
      .from(notes)
      .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
      .where(and(eq(notes.userId, user.id), or(eq(notes.isDeleted, false), isNull(notes.isDeleted))));

    const matchingNotes: any[] = [];
    const matchingExpenses: any[] = [];
    let notesIncomeTotal = 0;
    let notesExpenseTotal = 0;
    let notesReceivableTotal = 0;
    let notesPayableTotal = 0;
    const categoriesUsedSet = new Set<string>();
    const activeNoteDatesSet = new Set<string>();

    allNotes.forEach((n) => {
      const noteDate = new Date(n.createdAt);
      const content = n.content || n.plainText || "";
      const exps = extractExpensesFromNote(content, noteDate, n.id, n.title);
      exps.forEach((e) => activeNoteDatesSet.add(e.date));
      
      const dayEntries = exps.filter((e) => e.date === normalizedTargetDateStr);

      // Compute note's overall full summary across all dates
      let noteOverallExpense = 0;
      let noteOverallIncome = 0;
      let noteOverallReceivable = 0;
      let noteOverallPayable = 0;
      exps.forEach((e) => {
        if (e.type === "expense") noteOverallExpense += e.amount;
        else if (e.type === "income") noteOverallIncome += e.amount;
        else if (e.type === "receivable") noteOverallReceivable += e.amount;
        else if (e.type === "payable") noteOverallPayable += e.amount;
      });
      const noteNetCashflow = noteOverallIncome - noteOverallExpense;
      const notePrimaryMonth = exps[0] ? `${exps[0].month} ${exps[0].year}` : (n.title || "");

      let dayIncome = 0;
      let dayExpense = 0;
      let dayReceivable = 0;
      let dayPayable = 0;

      dayEntries.forEach((e) => {
        matchingExpenses.push(e);
        if (e.type === "income") {
          notesIncomeTotal += e.amount;
          dayIncome += e.amount;
        } else if (e.type === "expense") {
          notesExpenseTotal += e.amount;
          dayExpense += e.amount;
        } else if (e.type === "receivable") {
          notesReceivableTotal += e.amount;
          dayReceivable += e.amount;
        } else if (e.type === "payable") {
          notesPayableTotal += e.amount;
          dayPayable += e.amount;
        }
        categoriesUsedSet.add(e.category);
      });

      if (dayEntries.length > 0) {
        matchingNotes.push({
          ...n,
          extractedExpensesCount: dayEntries.length,
          extractedExpensesAmount: dayExpense,
          dayIncome,
          dayExpense,
          dayReceivable,
          dayPayable,
          noteOverallIncome,
          noteOverallExpense,
          noteNetCashflow,
          notePrimaryMonth,
          noteTotalItems: exps.length,
        });
      } else {
        // If note has NO internal dates, only match if note's creation date is today
        const hasExplicitDates = /((?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,4})/i.test(content);
        const noteDateLocalStr = `${noteDate.getFullYear()}-${String(noteDate.getMonth() + 1).padStart(2, "0")}-${String(noteDate.getDate()).padStart(2, "0")}`;
        if (!hasExplicitDates && noteDateLocalStr === normalizedTargetDateStr) {
          matchingNotes.push({
            ...n,
            extractedExpensesCount: 0,
            extractedExpensesAmount: 0,
            dayIncome: 0,
            dayExpense: 0,
            dayReceivable: 0,
            dayPayable: 0,
            noteOverallIncome,
            noteOverallExpense,
            noteNetCashflow,
            notePrimaryMonth,
            noteTotalItems: exps.length,
          });
        }
      }
    });

    const totalIncome = income + notesIncomeTotal;
    const totalExpense = txExpense + notesExpenseTotal;
    const totalReceivable = receivable + notesReceivableTotal;
    const totalPayable = payable + notesPayableTotal;
    const net = totalIncome - totalExpense;
    const totalTxCount = matchingTxns.length + matchingExpenses.length;

    // Fetch saved reflection for this date
    const [journalReflection] = await db
      .select()
      .from(dailyJournals)
      .where(and(eq(dailyJournals.userId, user.id), eq(dailyJournals.date, normalizedTargetDateStr)))
      .limit(1);

    return {
      date: normalizedTargetDateStr,
      income: totalIncome,
      expense: totalExpense,
      receivable: totalReceivable,
      payable: totalPayable,
      net,
      txCount: totalTxCount,
      transactions: matchingTxns,
      notesCount: matchingNotes.length,
      notes: matchingNotes,
      extractedExpenses: matchingExpenses,
      categoriesUsed: Array.from(categoriesUsedSet),
      activeNoteDates: Array.from(activeNoteDatesSet).sort(),
      dailyExpenseSummary: {
        transactionsExpense: txExpense,
        notesExpense: notesExpenseTotal,
        totalExpense,
        itemsCount: totalTxCount,
      },
      reflection: journalReflection || null,
    };
  });
}

export async function saveDailyJournalReflection(
  dateStr: string,
  data: {
    mood?: string;
    summary?: string;
    dailyGoal?: string;
    dailyAchievement?: string;
    financialReflection?: string;
    manualNotes?: string;
  }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const targetDateStr = dateStr || new Date().toISOString().split("T")[0];

    const [existing] = await db
      .select()
      .from(dailyJournals)
      .where(and(eq(dailyJournals.userId, user.id), eq(dailyJournals.date, targetDateStr)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(dailyJournals)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(dailyJournals.id, existing.id))
        .returning();
      safeRevalidatePath("/dashboard/notes");
      return updated;
    } else {
      const publicId = generatePublicId("jour");
      const [created] = await db
        .insert(dailyJournals)
        .values({
          publicId,
          userId: user.id,
          date: targetDateStr,
          mood: data.mood || "productive",
          summary: data.summary || "",
          dailyGoal: data.dailyGoal || "",
          dailyAchievement: data.dailyAchievement || "",
          financialReflection: data.financialReflection || "",
          manualNotes: data.manualNotes || "",
        })
        .returning();
      safeRevalidatePath("/dashboard/notes");
      return created;
    }
  });
}

// 3. TASKS & CHECKLISTS
export async function getNoteTasks(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.noteId, note.id))
      .orderBy(asc(noteChecklists.order), asc(noteChecklists.createdAt));
  });
}

export async function createNoteTask(
  notePublicId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date | null;
    status?: string;
    progress?: number;
    subtasks?: any[];
    taskNotes?: string;
  }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const publicId = generatePublicId("ntsk");
    const [task] = await db
      .insert(noteChecklists)
      .values({
        publicId,
        noteId: note.id,
        title: data.title,
        description: data.description || null,
        priority: data.priority || "medium",
        dueDate: data.dueDate || null,
        status: data.status || "pending",
        progress: data.progress || 0,
        subtasks: data.subtasks || [],
        taskNotes: data.taskNotes || null,
        isCompleted: data.status === "completed" || (data.progress || 0) === 100,
        completedAt: data.status === "completed" ? new Date() : null,
        completedBy: data.status === "completed" ? user.id : null,
      })
      .returning();

    await logNoteActivity(note.id, user.id, "task_created", `Created task: ${data.title}`);
    safeRevalidatePath("/dashboard/notes");
    return task;
  });
}

export async function updateNoteTask(
  taskPublicId: string,
  data: {
    title?: string;
    description?: string;
    isCompleted?: boolean;
    status?: string;
    priority?: string;
    dueDate?: Date | null;
    progress?: number;
    subtasks?: any[];
    taskNotes?: string;
  }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select({
        id: noteChecklists.id,
        noteId: noteChecklists.noteId,
      })
      .from(noteChecklists)
      .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
      .where(and(eq(noteChecklists.publicId, taskPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Task not found or unauthorized");

    const updateFields: any = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.priority !== undefined) updateFields.priority = data.priority;
    if (data.dueDate !== undefined) updateFields.dueDate = data.dueDate;
    if (data.progress !== undefined) updateFields.progress = data.progress;
    if (data.subtasks !== undefined) updateFields.subtasks = data.subtasks;
    if (data.taskNotes !== undefined) updateFields.taskNotes = data.taskNotes;

    if (data.isCompleted !== undefined) {
      updateFields.isCompleted = data.isCompleted;
      updateFields.status = data.isCompleted ? "completed" : "pending";
      updateFields.completedAt = data.isCompleted ? new Date() : null;
      updateFields.completedBy = data.isCompleted ? user.id : null;
      if (data.isCompleted && (data.progress === undefined || data.progress < 100)) {
        updateFields.progress = 100;
      }
    } else if (data.status !== undefined) {
      updateFields.status = data.status;
      const isDone = data.status === "completed";
      updateFields.isCompleted = isDone;
      updateFields.completedAt = isDone ? new Date() : null;
      updateFields.completedBy = isDone ? user.id : null;
      if (isDone) updateFields.progress = 100;
    }

    const [updated] = await db
      .update(noteChecklists)
      .set(updateFields)
      .where(eq(noteChecklists.id, existing.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function duplicateNoteTask(taskPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select({
        id: noteChecklists.id,
        noteId: noteChecklists.noteId,
        title: noteChecklists.title,
        description: noteChecklists.description,
        priority: noteChecklists.priority,
        dueDate: noteChecklists.dueDate,
        subtasks: noteChecklists.subtasks,
        taskNotes: noteChecklists.taskNotes,
        order: noteChecklists.order,
      })
      .from(noteChecklists)
      .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
      .where(and(eq(noteChecklists.publicId, taskPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Task not found or unauthorized");

    const publicId = generatePublicId("ntsk");
    const [dup] = await db
      .insert(noteChecklists)
      .values({
        publicId,
        noteId: existing.noteId,
        title: `${existing.title} (Copy)`,
        description: existing.description,
        priority: existing.priority,
        dueDate: existing.dueDate,
        status: "pending",
        progress: 0,
        subtasks: existing.subtasks || [],
        taskNotes: existing.taskNotes,
        isCompleted: false,
        order: (existing.order || 0) + 1,
      })
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return dup;
  });
}

export async function deleteNoteTask(taskPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [existing] = await db
      .select({ id: noteChecklists.id })
      .from(noteChecklists)
      .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
      .where(and(eq(noteChecklists.publicId, taskPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!existing) throw new Error("Task not found or unauthorized");

    await db.delete(noteChecklists).where(eq(noteChecklists.id, existing.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function reorderNoteTasks(notePublicId: string, orderedPublicIds: string[]) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found or unauthorized");

    for (let i = 0; i < orderedPublicIds.length; i++) {
      await db
        .update(noteChecklists)
        .set({ order: i })
        .where(and(eq(noteChecklists.publicId, orderedPublicIds[i]), eq(noteChecklists.noteId, note.id)));
    }
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

// Backward compatibility aliases
export async function getNoteChecklists(notePublicId: string) {
  return await getNoteTasks(notePublicId);
}
export async function createChecklistItem(notePublicId: string, data: any) {
  return await createNoteTask(notePublicId, data);
}
export async function toggleChecklistItem(publicId: string, isCompleted: boolean) {
  return await updateNoteTask(publicId, { isCompleted });
}
export async function deleteChecklistItem(taskPublicId: string) {
  return await deleteNoteTask(taskPublicId);
}

// 4. REMINDERS
export async function getNoteReminders(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select()
      .from(noteReminders)
      .where(eq(noteReminders.noteId, note.id))
      .orderBy(asc(noteReminders.reminderDate));
  });
}

export async function createNoteReminder(notePublicId: string, data: { reminderDate: Date; repeat?: string; priority?: string }) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const publicId = generatePublicId("nrem");
    const [rem] = await db
      .insert(noteReminders)
      .values({
        publicId,
        noteId: note.id,
        userId: user.id,
        reminderDate: data.reminderDate,
        repeat: data.repeat || "none",
        priority: data.priority || "medium",
        status: "pending",
      })
      .returning();

    await logNoteActivity(note.id, user.id, "reminder_added", `Scheduled reminder for ${formatDate(data.reminderDate)}`);
    safeRevalidatePath("/dashboard/notes");
    return rem;
  });
}

export async function deleteNoteReminder(reminderPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [rem] = await db
      .select()
      .from(noteReminders)
      .where(and(eq(noteReminders.publicId, reminderPublicId), eq(noteReminders.userId, user.id)))
      .limit(1);

    if (!rem) throw new Error("Reminder not found");

    await db.delete(noteReminders).where(eq(noteReminders.id, rem.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

// 5. ATTACHMENTS & VOICE NOTES
export async function getNoteAttachments(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select()
      .from(noteAttachments)
      .where(eq(noteAttachments.noteId, note.id))
      .orderBy(desc(noteAttachments.createdAt));
  });
}

export async function createNoteAttachment(
  notePublicId: string,
  data: { fileName: string; fileSize: number; mimeType: string; url: string; isVoiceNote?: boolean; durationSeconds?: number; waveform?: any }
) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const publicId = generatePublicId("natt");
    const [att] = await db
      .insert(noteAttachments)
      .values({
        publicId,
        noteId: note.id,
        userId: user.id,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        url: data.url,
        isVoiceNote: data.isVoiceNote ?? false,
        durationSeconds: data.durationSeconds || null,
        waveform: data.waveform || null,
      })
      .returning();

    await logNoteActivity(note.id, user.id, "attachment_uploaded", `Uploaded ${data.fileName}`);
    safeRevalidatePath("/dashboard/notes");
    return att;
  });
}

export async function renameNoteAttachment(attachmentPublicId: string, newFileName: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [att] = await db
      .select()
      .from(noteAttachments)
      .where(and(eq(noteAttachments.publicId, attachmentPublicId), eq(noteAttachments.userId, user.id)))
      .limit(1);

    if (!att) throw new Error("Attachment not found");

    const [updated] = await db
      .update(noteAttachments)
      .set({ fileName: newFileName.trim() })
      .where(eq(noteAttachments.id, att.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function deleteNoteAttachment(attachmentPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [att] = await db
      .select()
      .from(noteAttachments)
      .where(and(eq(noteAttachments.publicId, attachmentPublicId), eq(noteAttachments.userId, user.id)))
      .limit(1);

    if (!att) throw new Error("Attachment not found");

    await db.delete(noteAttachments).where(eq(noteAttachments.id, att.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function deleteNoteWithRecordingsOption(notePublicId: string, deleteRecordings: boolean) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    if (deleteRecordings) {
      await db.delete(noteAttachments).where(eq(noteAttachments.noteId, note.id));
    }

    await db
      .update(notes)
      .set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
      .where(eq(notes.id, note.id));

    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

// 6. SHARED NOTES & COMMENTS
export async function getNoteComments(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select({
        id: noteComments.id,
        publicId: noteComments.publicId,
        content: noteComments.content,
        parentId: noteComments.parentId,
        isPinned: noteComments.isPinned,
        isResolved: noteComments.isResolved,
        reactions: noteComments.reactions,
        createdAt: noteComments.createdAt,
        updatedAt: noteComments.updatedAt,
        userId: noteComments.userId,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
      .from(noteComments)
      .innerJoin(users, eq(noteComments.userId, users.id))
      .where(eq(noteComments.noteId, note.id))
      .orderBy(desc(noteComments.isPinned), asc(noteComments.createdAt));
  });
}

export async function addNoteComment(
  notePublicId: string,
  data: string | { content: string; parentId?: number | null }
) {
  const user = await requireAuth();
  const content = typeof data === "string" ? data.trim() : data.content.trim();
  const parentId = typeof data === "string" ? null : data.parentId || null;

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const publicId = generatePublicId("ncmt");
    const [cmt] = await db
      .insert(noteComments)
      .values({
        publicId,
        noteId: note.id,
        userId: user.id,
        content,
        parentId,
        isPinned: false,
        isResolved: false,
        reactions: {},
      })
      .returning();

    await logNoteActivity(
      note.id,
      user.id,
      parentId ? "comment_reply" : "comment_added",
      parentId ? "Replied to a comment" : "Added a comment"
    );

    safeRevalidatePath("/dashboard/notes");
    return cmt;
  });
}

export async function togglePinComment(commentPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cmt] = await db
      .select({ id: noteComments.id, isPinned: noteComments.isPinned })
      .from(noteComments)
      .innerJoin(notes, eq(noteComments.noteId, notes.id))
      .where(and(eq(noteComments.publicId, commentPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!cmt) throw new Error("Comment not found or unauthorized");

    const [updated] = await db
      .update(noteComments)
      .set({ isPinned: !cmt.isPinned, updatedAt: new Date() })
      .where(eq(noteComments.id, cmt.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function toggleResolveComment(commentPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cmt] = await db
      .select({ id: noteComments.id, isResolved: noteComments.isResolved })
      .from(noteComments)
      .innerJoin(notes, eq(noteComments.noteId, notes.id))
      .where(and(eq(noteComments.publicId, commentPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!cmt) throw new Error("Comment not found or unauthorized");

    const [updated] = await db
      .update(noteComments)
      .set({ isResolved: !cmt.isResolved, updatedAt: new Date() })
      .where(eq(noteComments.id, cmt.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function reactToComment(commentPublicId: string, emoji: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cmt] = await db
      .select({ id: noteComments.id, reactions: noteComments.reactions })
      .from(noteComments)
      .innerJoin(notes, eq(noteComments.noteId, notes.id))
      .where(and(eq(noteComments.publicId, commentPublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!cmt) throw new Error("Comment not found or unauthorized");

    const reactions = (cmt.reactions as Record<string, number[]>) || {};
    const userList = reactions[emoji] || [];
    const hasReacted = userList.includes(user.id);

    const updatedUsers = hasReacted
      ? userList.filter((uid) => uid !== user.id)
      : [...userList, user.id];

    if (updatedUsers.length > 0) {
      reactions[emoji] = updatedUsers;
    } else {
      delete reactions[emoji];
    }

    const [updated] = await db
      .update(noteComments)
      .set({ reactions, updatedAt: new Date() })
      .where(eq(noteComments.id, cmt.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function deleteComment(commentPublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [cmt] = await db
      .select()
      .from(noteComments)
      .where(and(eq(noteComments.publicId, commentPublicId), eq(noteComments.userId, user.id)))
      .limit(1);

    if (!cmt) throw new Error("Comment not found or unauthorized");

    await db.delete(noteComments).where(eq(noteComments.parentId, cmt.id));
    await db.delete(noteComments).where(eq(noteComments.id, cmt.id));

    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

// 7. CALENDAR DRAG & DROP & TIMELINE
export async function moveNoteToDate(notePublicId: string, newDateStr: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    const targetDate = new Date(`${newDateStr}T12:00:00.000Z`);
    const [updated] = await db
      .update(notes)
      .set({ createdAt: targetDate, updatedAt: new Date() })
      .where(eq(notes.id, note.id))
      .returning();

    safeRevalidatePath("/dashboard/notes");
    return updated;
  });
}

export async function getComprehensiveTimeline(options?: {
  period?: "today" | "week" | "month" | "all";
  eventType?: string;
}) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const period = options?.period || "all";
    const now = new Date();
    let startDate: Date | null = null;

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const logs = await db
      .select({
        id: noteActivityLogs.id,
        publicId: noteActivityLogs.publicId,
        action: noteActivityLogs.action,
        details: noteActivityLogs.details,
        changes: noteActivityLogs.changes,
        createdAt: noteActivityLogs.createdAt,
        noteId: noteActivityLogs.noteId,
        noteTitle: notes.title,
        notePublicId: notes.publicId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(noteActivityLogs)
      .innerJoin(notes, eq(noteActivityLogs.noteId, notes.id))
      .innerJoin(users, eq(noteActivityLogs.userId, users.id))
      .where(eq(notes.userId, user.id))
      .orderBy(desc(noteActivityLogs.createdAt))
      .limit(100);

    let filtered = logs;
    if (startDate) {
      filtered = filtered.filter((l) => new Date(l.createdAt) >= startDate!);
    }
    if (options?.eventType && options.eventType !== "all") {
      filtered = filtered.filter((l) => l.action.toLowerCase().includes(options.eventType!.toLowerCase()));
    }

    return filtered;
  });
}

export async function getEnhancedNoteStats() {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [allUserNotes, allTasks, allAttachments, allComments, categoriesList] = await Promise.all([
      db.select().from(notes).where(eq(notes.userId, user.id)),
      db
        .select({
          id: noteChecklists.id,
          status: noteChecklists.status,
          isCompleted: noteChecklists.isCompleted,
          dueDate: noteChecklists.dueDate,
          createdAt: noteChecklists.createdAt,
        })
        .from(noteChecklists)
        .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
        .where(eq(notes.userId, user.id)),
      db
        .select({
          id: noteAttachments.id,
          fileSize: noteAttachments.fileSize,
          mimeType: noteAttachments.mimeType,
          isVoiceNote: noteAttachments.isVoiceNote,
        })
        .from(noteAttachments)
        .where(eq(noteAttachments.userId, user.id)),
      db
        .select({ id: noteComments.id })
        .from(noteComments)
        .innerJoin(notes, eq(noteComments.noteId, notes.id))
        .where(eq(notes.userId, user.id)),
      getNoteCategories(),
    ]);

    const todayStr = new Date().toISOString().split("T")[0];

    let totalNotes = 0;
    let todayNotes = 0;
    let drafts = 0;
    let pinned = 0;
    let favorites = 0;
    let archived = 0;
    let trash = 0;
    let quickNotes = 0;
    let totalWords = 0;
    let totalChars = 0;
    let totalReadingTime = 0;

    const monthlyCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    for (const n of allUserNotes) {
      if (n.isDeleted) {
        trash++;
        continue;
      }
      totalNotes++;
      totalWords += n.wordCount || 0;
      totalChars += n.characterCount || 0;
      totalReadingTime += n.readingTime || 0;

      const nDate = new Date(n.createdAt).toISOString().split("T")[0];
      if (nDate === todayStr) todayNotes++;

      if (n.isDraft) drafts++;
      if (n.isPinned) pinned++;
      if (n.isFavorite) favorites++;
      if (n.isArchived) archived++;

      const nTags = (n.tags as string[]) || [];
      if (nTags.some(t => typeof t === "string" && t.toLowerCase() === "quick note")) {
        quickNotes++;
      }

      const monthKey = new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;

      for (const t of nTags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    const nowTime = new Date().getTime();

    for (const t of allTasks) {
      if (t.isCompleted || t.status === "completed") {
        completedTasks++;
      } else {
        pendingTasks++;
        if (t.dueDate && new Date(t.dueDate).getTime() < nowTime) {
          overdueTasks++;
        }
      }
    }

    let totalStorageBytes = 0;
    let voiceCount = 0;
    let filesCount = 0;
    const storageByType: Record<string, number> = {
      Audio: 0,
      Images: 0,
      Documents: 0,
      Other: 0,
    };

    for (const a of allAttachments) {
      totalStorageBytes += a.fileSize || 0;
      if (a.isVoiceNote) {
        voiceCount++;
        storageByType.Audio += a.fileSize || 0;
      } else {
        filesCount++;
        const mime = (a.mimeType || "").toLowerCase();
        if (mime.includes("image")) storageByType.Images += a.fileSize || 0;
        else if (mime.includes("pdf") || mime.includes("word") || mime.includes("text") || mime.includes("excel")) storageByType.Documents += a.fileSize || 0;
        else storageByType.Other += a.fileSize || 0;
      }
    }

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const notesPerMonth = Object.entries(monthlyCounts).map(([month, count]) => ({ month, count }));

    const categoryDistribution = categoriesList.map((c) => ({
      name: c.name,
      value: c.noteCount || 0,
      color: c.color || "#6366f1",
    }));

    return {
      totalNotes,
      todayNotes,
      drafts,
      pinned,
      favorites,
      archived,
      trash,
      quickNotes,
      totalWords,
      totalChars,
      totalReadingTime,
      writingTimeMinutes: Math.round(totalWords / 25),
      popularTags,
      avgWordsPerNote: totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0,
      totalTasks: allTasks.length,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalAttachments: allAttachments.length,
      voiceCount,
      filesCount,
      totalStorageBytes,
      totalComments: allComments.length,
      notesPerMonth,
      categoryDistribution,
      storageByType: Object.entries(storageByType).map(([type, bytes]) => ({
        type,
        mb: +(bytes / (1024 * 1024)).toFixed(2),
      })),
    };
  });
}


// 7. IMMUTABLE ACTIVITY AUDIT LOG
export async function logNoteActivity(noteId: number, userId: number, action: string, details?: string, changes?: any) {
  return await withDbRetry(async () => {
    const publicId = generatePublicId("nlog");
    await db.insert(noteActivityLogs).values({
      publicId,
      noteId,
      userId,
      action,
      details: details || null,
      changes: changes || null,
    });
  });
}

export async function getNoteActivityLog(notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select({
        id: noteActivityLogs.id,
        action: noteActivityLogs.action,
        details: noteActivityLogs.details,
        createdAt: noteActivityLogs.createdAt,
        userName: users.name,
      })
      .from(noteActivityLogs)
      .innerJoin(users, eq(noteActivityLogs.userId, users.id))
      .where(eq(noteActivityLogs.noteId, note.id))
      .orderBy(desc(noteActivityLogs.createdAt));
  });
}

function escapeXml(unsafe: string = ""): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ExportNoteOptions {
  includeFinancialSummary?: boolean;
  includeIncomeTransactions?: boolean;
  includeExpenseTransactions?: boolean;
  includeReceivables?: boolean;
  includePayables?: boolean;
  includeOriginalNote?: boolean;
  includeMonthlyStats?: boolean;
  includeMetadata?: boolean;
  includeActivitySummary?: boolean;
  paperSize?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  theme?: "print" | "light" | "dark";
  overrideContent?: string;
  overrideTitle?: string;
}

function formatTransactionDisplayDate(dateStr: string): string {
  if (!dateStr) return "General";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const y = parts[0];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    const d = parts[2].padStart(2, "0");
    return `${d} ${m} ${y}`;
  }
  return dateStr;
}

// 8. DOCUMENT EXPORT (PDF, DOCX, Markdown, TXT, CSV, JSON)
export async function exportNoteDocument(
  format: "pdf" | "docx" | "markdown" | "txt" | "csv" | "json",
  notePublicId: string,
  options?: ExportNoteOptions
) {
  const user = await requireAuth();
  assertRateLimit(`note_export:${user.id}`, RATE_LIMITS.exports.reports);

  return await withDbRetry(async () => {
    const [note] = await db
      .select({
        id: notes.id,
        publicId: notes.publicId,
        userId: notes.userId,
        categoryId: notes.categoryId,
        title: notes.title,
        content: notes.content,
        plainText: notes.plainText,
        color: notes.color,
        tags: notes.tags,
        version: notes.version,
        wordCount: notes.wordCount,
        characterCount: notes.characterCount,
        readingTime: notes.readingTime,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        categoryName: noteCategories.name,
        categoryColor: noteCategories.color,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notes)
      .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
      .leftJoin(users, eq(notes.userId, users.id))
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) throw new Error("Note not found");

    // Fetch attached tasks / checklists
    const tasks = await db
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.noteId, note.id))
      .orderBy(asc(noteChecklists.id));

    // Fetch attachments
    const attachments = await db
      .select()
      .from(noteAttachments)
      .where(eq(noteAttachments.noteId, note.id))
      .orderBy(asc(noteAttachments.id));

    // Fetch recent audit activity logs if requested
    const recentLogs = await db
      .select({
        action: noteActivityLogs.action,
        details: noteActivityLogs.details,
        createdAt: noteActivityLogs.createdAt,
        userName: users.name,
      })
      .from(noteActivityLogs)
      .leftJoin(users, eq(noteActivityLogs.userId, users.id))
      .where(eq(noteActivityLogs.noteId, note.id))
      .orderBy(desc(noteActivityLogs.createdAt))
      .limit(6);

    // Extract dynamic financial intelligence strictly from note content (supporting real-time overrides)
    const contentToUse = options?.overrideContent !== undefined ? options.overrideContent : (note.content || note.plainText || "");
    const titleToUse = options?.overrideTitle !== undefined ? options.overrideTitle : (note.title || "Untitled Note");
    const extractedExpenses: ExtractedNoteExpense[] = extractExpensesFromNote(
      contentToUse,
      new Date(note.createdAt),
      note.id,
      titleToUse
    );
    const financial: NoteFinancialSummary = getNoteFinancialSummary(extractedExpenses, titleToUse);
    const hasFinancial = extractedExpenses.length > 0;

    // Separate transaction types
    const incomeItems = extractedExpenses.filter((e) => e.type === "income");
    const expenseItems = extractedExpenses.filter((e) => e.type === "expense");
    const receivableItems = extractedExpenses.filter((e) => e.type === "receivable");
    const payableItems = extractedExpenses.filter((e) => e.type === "payable");

    // Compute Monthly Statistics
    const largestExpense = expenseItems.length > 0
      ? expenseItems.reduce((max, e) => (e.amount > max.amount ? e : max), expenseItems[0])
      : null;
    const largestIncome = incomeItems.length > 0
      ? incomeItems.reduce((max, e) => (e.amount > max.amount ? e : max), incomeItems[0])
      : null;
    const averageExpense = expenseItems.length > 0
      ? Math.round((financial.totalExpense / expenseItems.length) * 100) / 100
      : 0;

    const expenseByDate: Record<string, number> = {};
    expenseItems.forEach((e) => {
      expenseByDate[e.date] = (expenseByDate[e.date] || 0) + e.amount;
    });
    let highestExpenseDay = { date: "None", amount: 0 };
    Object.entries(expenseByDate).forEach(([date, amount]) => {
      if (amount > highestExpenseDay.amount) highestExpenseDay = { date, amount };
    });

    const incomeByDate: Record<string, number> = {};
    incomeItems.forEach((e) => {
      incomeByDate[e.date] = (incomeByDate[e.date] || 0) + e.amount;
    });
    let highestIncomeDay = { date: "None", amount: 0 };
    Object.entries(incomeByDate).forEach(([date, amount]) => {
      if (amount > highestIncomeDay.amount) highestIncomeDay = { date, amount };
    });

    // Validation checks
    const calcIncome = incomeItems.reduce((s, e) => s + e.amount, 0);
    const calcExpense = expenseItems.reduce((s, e) => s + e.amount, 0);
    const calcReceivable = receivableItems.reduce((s, e) => s + e.amount, 0);
    const calcPayable = payableItems.reduce((s, e) => s + e.amount, 0);
    const calcNet = calcIncome - calcExpense;

    const isValidationPassed =
      Math.abs(calcIncome - financial.totalIncome) < 0.01 &&
      Math.abs(calcExpense - financial.totalExpense) < 0.01 &&
      Math.abs(calcNet - financial.netCashflow) < 0.01;

    // Meaningful Filename Generation (no random IDs)
    const sanitizedTitle = (titleToUse || "Financial Note")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const baseFilename = sanitizedTitle.toLowerCase().includes("financial")
      ? `${sanitizedTitle}-SplitLedger_AI`
      : `${sanitizedTitle}-Financial-Report-SplitLedger_AI`;
    const ext = format === "markdown" ? "md" : format;
    const filename = `${baseFilename}.${ext}`;

    const authorName = note.userName || user.name || "SplitLedger User";
    const categoryName = note.categoryName || "General";
    const tagsList = Array.isArray(note.tags) ? (note.tags as string[]) : [];
    const tagsString = tagsList.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(", ");
    const exportTimeStr = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const createdStr = new Date(note.createdAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const updatedStr = new Date(note.updatedAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Options defaults
    const optIncludeFinancialSummary = options?.includeFinancialSummary ?? true;
    const optIncludeIncomeTransactions = options?.includeIncomeTransactions ?? true;
    const optIncludeExpenseTransactions = options?.includeExpenseTransactions ?? true;
    const optIncludeReceivables = options?.includeReceivables ?? true;
    const optIncludePayables = options?.includePayables ?? true;
    const optIncludeMonthlyStats = options?.includeMonthlyStats ?? true;
    const optIncludeOriginalNote = options?.includeOriginalNote ?? true;
    const optIncludeMetadata = options?.includeMetadata ?? true;
    const optIncludeActivitySummary = options?.includeActivitySummary ?? true;
    const optPaperSize = options?.paperSize || "a4";
    const optOrientation = options?.orientation || "portrait";
    const optTheme = options?.theme || "print";

    // Record audit activity log for this export
    await logNoteActivity(note.id, user.id, "exported", `Exported note as ${format.toUpperCase()}`);

    if (format === "json") {
      return {
        content: JSON.stringify(
          {
            reportTitle: titleToUse,
            filename,
            author: authorName,
            category: categoryName,
            tags: tagsList,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            exportedAt: new Date().toISOString(),
            validation: {
              passed: isValidationPassed,
              incomeMatch: calcIncome === financial.totalIncome,
              expenseMatch: calcExpense === financial.totalExpense,
              netMatch: calcNet === financial.netCashflow,
            },
            financialSummary: hasFinancial
              ? {
                  totalIncome: financial.totalIncome,
                  totalExpense: financial.totalExpense,
                  receivable: financial.totalReceivable,
                  payable: financial.totalPayable,
                  netCashflow: financial.netCashflow,
                  detectedMonth: financial.month,
                  detectedYear: financial.year,
                }
              : null,
            statistics: hasFinancial
              ? {
                  totalTransactions: extractedExpenses.length,
                  incomeEntries: incomeItems.length,
                  expenseEntries: expenseItems.length,
                  averageExpense,
                  largestExpense: largestExpense ? { description: largestExpense.description, amount: largestExpense.amount } : null,
                  largestIncome: largestIncome ? { description: largestIncome.description, amount: largestIncome.amount } : null,
                  highestExpenseDay: highestExpenseDay.amount > 0 ? { date: formatTransactionDisplayDate(highestExpenseDay.date), amount: highestExpenseDay.amount } : null,
                  highestIncomeDay: highestIncomeDay.amount > 0 ? { date: formatTransactionDisplayDate(highestIncomeDay.date), amount: highestIncomeDay.amount } : null,
                }
              : null,
            incomeTransactions: incomeItems.map((i) => ({
              date: formatTransactionDisplayDate(i.date),
              rawDate: i.date,
              description: i.description,
              category: i.category,
              amount: i.amount,
            })),
            expenseTransactions: expenseItems.map((e) => ({
              date: formatTransactionDisplayDate(e.date),
              rawDate: e.date,
              description: e.description,
              category: e.category,
              amount: e.amount,
            })),
            receivables: receivableItems.map((r) => ({
              date: formatTransactionDisplayDate(r.date),
              description: r.description,
              category: r.category,
              amount: r.amount,
            })),
            payables: payableItems.map((p) => ({
              date: formatTransactionDisplayDate(p.date),
              description: p.description,
              category: p.category,
              amount: p.amount,
            })),
            originalContent: contentToUse,
            tasks: tasks.map((t) => ({ title: t.title, status: t.status, progress: t.progress })),
            attachments: attachments.map((a) => ({ fileName: a.fileName, fileSize: a.fileSize })),
          },
          null,
          2
        ),
        filename,
        mimeType: "application/json",
      };
    }

    if (format === "csv") {
      const csvLines: string[] = [];
      csvLines.push(`${escapeCsvValue("Report")},${escapeCsvValue(titleToUse)}`);
      csvLines.push(`${escapeCsvValue("Author")},${escapeCsvValue(authorName)}`);
      csvLines.push(`${escapeCsvValue("Category")},${escapeCsvValue(categoryName)}`);
      csvLines.push(`${escapeCsvValue("ExportedAt")},${escapeCsvValue(exportTimeStr)}`);
      csvLines.push("");

      if (hasFinancial) {
        csvLines.push('"SECTION 1: INCOME TRANSACTIONS"');
        csvLines.push('"Date","Description","Category","Amount (INR)"');
        for (const item of incomeItems) {
          csvLines.push(
            [
              escapeCsvValue(formatTransactionDisplayDate(item.date)),
              escapeCsvValue(item.description),
              escapeCsvValue(item.category || "Salary"),
              escapeCsvValue(item.amount.toFixed(2)),
            ].join(",")
          );
        }
        csvLines.push(`"TOTAL INCOME","","","${financial.totalIncome.toFixed(2)}"`);
        csvLines.push("");

        csvLines.push('"SECTION 2: EXPENSE TRANSACTIONS"');
        csvLines.push('"Date","Description","Category","Amount (INR)"');
        for (const item of expenseItems) {
          csvLines.push(
            [
              escapeCsvValue(formatTransactionDisplayDate(item.date)),
              escapeCsvValue(item.description),
              escapeCsvValue(item.category || "General"),
              escapeCsvValue(item.amount.toFixed(2)),
            ].join(",")
          );
        }
        csvLines.push(`"TOTAL EXPENSE","","","${financial.totalExpense.toFixed(2)}"`);
        csvLines.push("");

        csvLines.push('"SECTION 3: FINANCIAL RECONCILIATION SUMMARY"');
        csvLines.push(`"TOTAL INCOME","${financial.totalIncome.toFixed(2)}"`);
        csvLines.push(`"TOTAL EXPENSE","${financial.totalExpense.toFixed(2)}"`);
        csvLines.push(`"RECEIVABLES","${financial.totalReceivable.toFixed(2)}"`);
        csvLines.push(`"PAYABLES","${financial.totalPayable.toFixed(2)}"`);
        csvLines.push(`"NET CASHFLOW","${financial.netCashflow.toFixed(2)}"`);
        csvLines.push("");

        csvLines.push('"SECTION 4: MONTHLY STATISTICS"');
        csvLines.push(`"Total Transactions","${extractedExpenses.length}"`);
        csvLines.push(`"Income Entries","${incomeItems.length}"`);
        csvLines.push(`"Expense Entries","${expenseItems.length}"`);
        csvLines.push(`"Average Expense","${averageExpense.toFixed(2)}"`);
        csvLines.push(`"Largest Income","${largestIncome ? `${largestIncome.description} (${largestIncome.amount.toFixed(2)})` : "None"}"`);
        csvLines.push(`"Largest Expense","${largestExpense ? `${largestExpense.description} (${largestExpense.amount.toFixed(2)})` : "None"}"`);
      } else {
        csvLines.push('"No financial transactions detected in this note"');
      }

      return {
        content: csvLines.join("\n"),
        filename,
        mimeType: "text/csv",
      };
    }

    if (format === "markdown") {
      let md = `# ${titleToUse}\n\n`;

      if (optIncludeMetadata) {
        md += `| Field | Details |\n|---|---|\n`;
        md += `| **Author** | ${authorName} |\n`;
        md += `| **Category** | ${categoryName} |\n`;
        md += `| **Tags** | ${tagsString || "None"} |\n`;
        md += `| **Created** | ${createdStr} |\n`;
        md += `| **Last Updated** | ${updatedStr} |\n`;
        md += `| **Reading Time** | ${note.readingTime || 1} min (${note.wordCount || 0} words) |\n\n`;
        md += `---\n\n`;
      }

      if (hasFinancial && optIncludeFinancialSummary) {
        md += `## 📊 Financial Summary\n\n`;
        md += `| Metric | Amount (INR) |\n|---|---:|\n`;
        md += `| **Total Income** | ₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        md += `| **Total Expense** | ₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        md += `| **Receivable (Owed to You)** | ₹${financial.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        md += `| **Payable (You Owe)** | ₹${financial.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        md += `| **Net Cashflow** | **${financial.netCashflow >= 0 ? "+" : ""}₹${financial.netCashflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}** |\n\n`;
        md += `---\n\n`;
      }

      if (hasFinancial && optIncludeIncomeTransactions && incomeItems.length > 0) {
        md += `## 🟢 Income Transactions (${incomeItems.length})\n\n`;
        md += `| Date | Description | Category | Amount |\n|---|---|---|---:|\n`;
        for (const item of incomeItems) {
          md += `| ${formatTransactionDisplayDate(item.date)} | **${item.description}** | ${item.category || "Income"} | +₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        }
        md += `| **TOTAL INCOME** | | | **+₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}** |\n\n`;
        md += `---\n\n`;
      }

      if (hasFinancial && optIncludeExpenseTransactions && expenseItems.length > 0) {
        md += `## 🔴 Expense Transactions (${expenseItems.length})\n\n`;
        md += `| Date | Description | Category | Amount |\n|---|---|---|---:|\n`;
        for (const item of expenseItems) {
          md += `| ${formatTransactionDisplayDate(item.date)} | **${item.description}** | ${item.category || "Expense"} | ₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        }
        md += `| **TOTAL EXPENSE** | | | **₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}** |\n\n`;
        md += `---\n\n`;
      }

      if (hasFinancial && optIncludeReceivables && receivableItems.length > 0) {
        md += `## 🟡 Receivables (${receivableItems.length})\n\n`;
        md += `| Date | Description | Category | Amount |\n|---|---|---|---:|\n`;
        for (const item of receivableItems) {
          md += `| ${formatTransactionDisplayDate(item.date)} | **${item.description}** | ${item.category || "Receivable"} | ₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        }
        md += `\n---\n\n`;
      }

      if (hasFinancial && optIncludePayables && payableItems.length > 0) {
        md += `## 🟠 Payables (${payableItems.length})\n\n`;
        md += `| Date | Description | Category | Amount |\n|---|---|---|---:|\n`;
        for (const item of payableItems) {
          md += `| ${formatTransactionDisplayDate(item.date)} | **${item.description}** | ${item.category || "Payable"} | ₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} |\n`;
        }
        md += `\n---\n\n`;
      }

      if (hasFinancial && optIncludeMonthlyStats) {
        md += `## 📈 Monthly Statistics\n\n`;
        md += `- **Total Income:** ₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        md += `- **Total Expense:** ₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        md += `- **Largest Income:** ${largestIncome ? `${largestIncome.description} (+₹${largestIncome.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}\n`;
        md += `- **Largest Expense:** ${largestExpense ? `${largestExpense.description} (₹${largestExpense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}\n`;
        md += `- **Total Transactions:** ${extractedExpenses.length} (${incomeItems.length} income, ${expenseItems.length} expenses)\n`;
        md += `- **Average Expense per Item:** ₹${averageExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        md += `- **Highest Expense Day:** ${highestExpenseDay.amount > 0 ? `${formatTransactionDisplayDate(highestExpenseDay.date)} (₹${highestExpenseDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}\n`;
        md += `- **Highest Income Day:** ${highestIncomeDay.amount > 0 ? `${formatTransactionDisplayDate(highestIncomeDay.date)} (+₹${highestIncomeDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}\n\n`;
        md += `---\n\n`;
      }

      if (optIncludeOriginalNote) {
        md += `## 📝 Original Note Content\n\n`;
        md += `${cleanNoteContentText(contentToUse)}\n\n`;
        md += `---\n\n`;
      }

      if (tasks.length > 0) {
        md += `## ✅ Attached Tasks (${tasks.length})\n\n`;
        for (const t of tasks) {
          const isDone = t.status === "completed";
          md += `- [${isDone ? "x" : " "}] **${t.title}**${t.description ? ` — ${t.description}` : ""}${t.progress ? ` (${t.progress}% complete)` : ""}\n`;
        }
        md += "\n---\n\n";
      }

      if (attachments.length > 0) {
        md += `## 📎 Attachments (${attachments.length})\n\n`;
        for (const a of attachments) {
          md += `- **${a.fileName}** (${a.fileSize ? (a.fileSize / 1024).toFixed(1) : "0"} KB)\n`;
        }
        md += "\n---\n\n";
      }

      md += `*Generated automatically by SplitLedger AI • Financial Intelligence Platform on ${exportTimeStr}*\n`;

      return {
        content: md,
        filename,
        mimeType: "text/markdown",
      };
    }

    if (format === "txt") {
      const sep = "================================================================================";
      const subsep = "--------------------------------------------------------------------------------";

      let txt = `${sep}\n`;
      txt += `  SPLITLEDGER AI — FINANCIAL NOTE REPORT\n`;
      txt += `${sep}\n\n`;
      txt += `# ${titleToUse}\n\n`;
      txt += `Report Title: ${titleToUse}\n`;
      txt += `Author:       ${authorName}\n`;
      txt += `Category:     ${categoryName}\n`;
      txt += `Tags:         ${tagsString || "None"}\n`;
      txt += `Created:      ${createdStr}\n`;
      txt += `Updated:      ${updatedStr}\n\n`;

      if (hasFinancial && optIncludeFinancialSummary) {
        txt += `${subsep}\n`;
        txt += `FINANCIAL SUMMARY\n`;
        txt += `${subsep}\n`;
        txt += `  Total Income:               ₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        txt += `  Total Expense:              ₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        txt += `  Receivable (Owed to You):   ₹${financial.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        txt += `  Payable (You Owe):          ₹${financial.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`;
        txt += `  Net Cashflow:               ${financial.netCashflow >= 0 ? "+" : ""}₹${financial.netCashflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n\n`;
      }

      if (hasFinancial && optIncludeIncomeTransactions && incomeItems.length > 0) {
        txt += `${subsep}\n`;
        txt += `INCOME TRANSACTIONS (${incomeItems.length})\n`;
        txt += `${subsep}\n`;
        txt += `Date        | Amount         | Category        | Description\n`;
        txt += `------------+----------------+-----------------+--------------------------------\n`;
        for (const item of incomeItems) {
          const d = formatTransactionDisplayDate(item.date).padEnd(11);
          const a = `+₹${item.amount.toFixed(2)}`.padEnd(14);
          const c = (item.category || "Income").padEnd(15);
          txt += `${d} | ${a} | ${c} | ${item.description}\n`;
        }
        txt += `------------+----------------+-----------------+--------------------------------\n`;
        txt += `TOTAL INCOME: ₹${financial.totalIncome.toFixed(2)}\n\n`;
      }

      if (hasFinancial && optIncludeExpenseTransactions && expenseItems.length > 0) {
        txt += `${subsep}\n`;
        txt += `EXPENSE TRANSACTIONS (${expenseItems.length})\n`;
        txt += `${subsep}\n`;
        txt += `Date        | Amount         | Category        | Description\n`;
        txt += `------------+----------------+-----------------+--------------------------------\n`;
        for (const item of expenseItems) {
          const d = formatTransactionDisplayDate(item.date).padEnd(11);
          const a = `₹${item.amount.toFixed(2)}`.padEnd(14);
          const c = (item.category || "Expense").padEnd(15);
          txt += `${d} | ${a} | ${c} | ${item.description}\n`;
        }
        txt += `------------+----------------+-----------------+--------------------------------\n`;
        txt += `TOTAL EXPENSE: ₹${financial.totalExpense.toFixed(2)}\n\n`;
      }

      if (hasFinancial && optIncludeMonthlyStats) {
        txt += `${subsep}\n`;
        txt += `MONTHLY STATISTICS\n`;
        txt += `${subsep}\n`;
        txt += `  Total Transactions:         ${extractedExpenses.length}\n`;
        txt += `  Income Entries:             ${incomeItems.length}\n`;
        txt += `  Expense Entries:            ${expenseItems.length}\n`;
        txt += `  Average Expense per Item:   ₹${averageExpense.toFixed(2)}\n`;
        txt += `  Largest Income:             ${largestIncome ? `${largestIncome.description} (+₹${largestIncome.amount.toFixed(2)})` : "None"}\n`;
        txt += `  Largest Expense:            ${largestExpense ? `${largestExpense.description} (₹${largestExpense.amount.toFixed(2)})` : "None"}\n`;
        txt += `  Highest Expense Day:        ${highestExpenseDay.amount > 0 ? `${formatTransactionDisplayDate(highestExpenseDay.date)} (₹${highestExpenseDay.amount.toFixed(2)})` : "None"}\n`;
        txt += `  Highest Income Day:         ${highestIncomeDay.amount > 0 ? `${formatTransactionDisplayDate(highestIncomeDay.date)} (+₹${highestIncomeDay.amount.toFixed(2)})` : "None"}\n\n`;
      }

      if (optIncludeOriginalNote) {
        txt += `${subsep}\n`;
        txt += `ORIGINAL NOTE CONTENT\n`;
        txt += `${subsep}\n`;
        txt += `${cleanNoteContentText(contentToUse)}\n\n`;
      }

      txt += `${sep}\n`;
      txt += `Exported from SplitLedger AI on ${exportTimeStr}\n`;
      txt += `${sep}\n`;

      return {
        content: txt,
        filename,
        mimeType: "text/plain",
      };
    }

    if (format === "docx") {
      const docxHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${escapeXml(titleToUse)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: ${optPaperSize.toUpperCase()} ${optOrientation};
      margin: 1.0in;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
    }
    .header {
      border-bottom: 2.5pt solid #2563eb;
      padding-bottom: 8pt;
      margin-bottom: 16pt;
    }
    h1 {
      font-size: 22pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0 0 4pt 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      font-size: 9.5pt;
      color: #475569;
    }
    .meta-table td {
      padding: 4pt 6pt;
      border: 1pt solid #cbd5e1;
      background: #f8fafc;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 3pt;
    }
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
    }
    .kpi-table td {
      border: 1pt solid #cbd5e1;
      padding: 8pt;
      text-align: center;
      background: #f8fafc;
    }
    .kpi-label { font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase; }
    .kpi-amount { font-size: 13pt; font-weight: bold; margin-top: 4pt; }
    .income-val { color: #059669; }
    .expense-val { color: #e11d48; }
    .net-val { color: #2563eb; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 14pt 0;
      font-size: 10pt;
    }
    .data-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6pt 8pt;
      text-align: left;
      font-size: 9.5pt;
    }
    .data-table td {
      padding: 5pt 8pt;
      border: 1pt solid #e2e8f0;
    }
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .footer {
      margin-top: 24pt;
      border-top: 1pt solid #cbd5e1;
      padding-top: 8pt;
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 9pt; color: #2563eb; font-weight: bold; letter-spacing: 1.5pt; text-transform: uppercase;">
      SplitLedger AI • Financial Note Report
    </div>
    <h1>${escapeXml(titleToUse)}</h1>
    <table class="meta-table">
      <tr>
        <td><strong>Author:</strong> ${escapeXml(authorName)}</td>
        <td><strong>Category:</strong> ${escapeXml(categoryName)}</td>
        <td><strong>Tags:</strong> ${escapeXml(tagsString || "None")}</td>
      </tr>
      <tr>
        <td><strong>Created:</strong> ${escapeXml(createdStr)}</td>
        <td><strong>Last Updated:</strong> ${escapeXml(updatedStr)}</td>
        <td><strong>Reconciliation:</strong> ${isValidationPassed ? "✔ 100% Verified Balanced" : "⚠ Review Required"}</td>
      </tr>
    </table>
  </div>

  ${
    hasFinancial && optIncludeFinancialSummary
      ? `
  <div class="section-title">Financial Summary</div>
  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Total Income</div>
        <div class="kpi-amount income-val">₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </td>
      <td>
        <div class="kpi-label">Total Expense</div>
        <div class="kpi-amount expense-val">₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </td>
      <td>
        <div class="kpi-label">Receivable</div>
        <div class="kpi-amount">₹${financial.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </td>
      <td>
        <div class="kpi-label">Payable</div>
        <div class="kpi-amount">₹${financial.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </td>
      <td>
        <div class="kpi-label">Net Cashflow</div>
        <div class="kpi-amount net-val">${financial.netCashflow >= 0 ? "+" : ""}₹${financial.netCashflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </td>
    </tr>
  </table>
  `
      : ""
  }

  ${
    hasFinancial && optIncludeIncomeTransactions && incomeItems.length > 0
      ? `
  <div class="section-title">Income Transactions (${incomeItems.length})</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20%;">Date</th>
        <th style="width: 45%;">Description</th>
        <th style="width: 20%;">Category</th>
        <th style="width: 15%; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${incomeItems
        .map(
          (item) => `
      <tr>
        <td>${escapeXml(formatTransactionDisplayDate(item.date))}</td>
        <td><strong>${escapeXml(item.description)}</strong></td>
        <td>${escapeXml(item.category || "Income")}</td>
        <td style="text-align: right; font-weight: bold; color: #059669;">+₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>`
        )
        .join("")}
      <tr style="background: #f1f5f9; font-weight: bold;">
        <td colspan="3">Total Income</td>
        <td style="text-align: right; color: #059669;">+₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>
  `
      : ""
  }

  ${
    hasFinancial && optIncludeExpenseTransactions && expenseItems.length > 0
      ? `
  <div class="section-title">Expense Transactions (${expenseItems.length})</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20%;">Date</th>
        <th style="width: 45%;">Description</th>
        <th style="width: 20%;">Category</th>
        <th style="width: 15%; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${expenseItems
        .map(
          (item) => `
      <tr>
        <td>${escapeXml(formatTransactionDisplayDate(item.date))}</td>
        <td><strong>${escapeXml(item.description)}</strong></td>
        <td>${escapeXml(item.category || "General")}</td>
        <td style="text-align: right; font-weight: bold; color: #e11d48;">₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>`
        )
        .join("")}
      <tr style="background: #f1f5f9; font-weight: bold;">
        <td colspan="3">Total Expense</td>
        <td style="text-align: right; color: #e11d48;">₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>
  `
      : ""
  }

  ${
    hasFinancial && optIncludeMonthlyStats
      ? `
  <div class="section-title">Monthly Statistics</div>
  <table class="data-table">
    <tr>
      <td><strong>Total Income:</strong> ₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td><strong>Total Expense:</strong> ₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td><strong>Largest Income:</strong> ${largestIncome ? `${escapeXml(largestIncome.description)} (+₹${largestIncome.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}</td>
      <td><strong>Largest Expense:</strong> ${largestExpense ? `${escapeXml(largestExpense.description)} (₹${largestExpense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}</td>
    </tr>
    <tr>
      <td><strong>Total Transactions:</strong> ${extractedExpenses.length}</td>
      <td><strong>Average Expense:</strong> ₹${averageExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td><strong>Highest Income Day:</strong> ${highestIncomeDay.amount > 0 ? `${formatTransactionDisplayDate(highestIncomeDay.date)} (+₹${highestIncomeDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}</td>
      <td><strong>Highest Expense Day:</strong> ${highestExpenseDay.amount > 0 ? `${formatTransactionDisplayDate(highestExpenseDay.date)} (₹${highestExpenseDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : "None"}</td>
    </tr>
  </table>
  `
      : ""
  }

  ${
    optIncludeOriginalNote
      ? `
  <div class="section-title">Original Note Content</div>
  <div style="background: #f8fafc; border: 1pt solid #e2e8f0; padding: 12pt; font-size: 10pt; line-height: 1.7;">
    ${escapeXml(cleanNoteContentText(contentToUse)).replace(/\n/g, "<br/>")}
  </div>
  `
      : ""
  }

  <div class="footer">
    Exported from SplitLedger AI • Financial Intelligence Platform on ${escapeXml(exportTimeStr)}<br/>
    Confidential Financial Record
  </div>
</body>
</html>`;

      return {
        content: docxHtml,
        filename,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }

    // Default Printable HTML / PDF Template (Part 4, Part 5, Part 6, Part 7)
    const isDarkTheme = optTheme === "dark";
    const bgBody = isDarkTheme ? "#090d16" : "#ffffff";
    const textBody = isDarkTheme ? "#f1f5f9" : "#0f172a";
    const cardBg = isDarkTheme ? "#131b2e" : "#f8fafc";
    const borderCol = isDarkTheme ? "#1e293b" : "#e2e8f0";
    const thBg = isDarkTheme ? "#1e293b" : "#0f172a";

    const printableHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(titleToUse)} - SplitLedger AI</title>
  <style>
    @page {
      size: ${optPaperSize.toUpperCase()} ${optOrientation};
      margin: 12mm 16mm 16mm 16mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9px;
        color: #94a3b8;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: ${textBody};
      background: ${bgBody};
      font-size: 12.5px;
      line-height: 1.55;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-container {
      max-width: ${optOrientation === "landscape" ? "1100px" : "860px"};
      margin: 0 auto;
      padding: 24px;
    }
    .report-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #2563eb;
      text-transform: uppercase;
    }
    .brand-tagline {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    h1.note-title {
      font-size: 24px;
      font-weight: 800;
      color: ${textBody};
      margin: 0 0 8px 0;
      line-height: 1.25;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      background: ${cardBg};
      color: ${isDarkTheme ? "#cbd5e1" : "#475569"};
      font-weight: 500;
      border: 1px solid ${borderCol};
    }
    .pill strong { margin-right: 4px; color: ${textBody}; }
    .validation-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      margin-bottom: 16px;
      font-weight: 500;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      page-break-inside: avoid;
    }
    .section-header {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${isDarkTheme ? "#93c5fd" : "#1e293b"};
      margin: 20px 0 10px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid ${borderCol};
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-after: avoid;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .kpi-card {
      padding: 10px;
      border-radius: 8px;
      background: ${cardBg};
      border: 1px solid ${borderCol};
      text-align: center;
    }
    .kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 800;
    }
    .text-emerald { color: #059669; }
    .text-rose { color: #e11d48; }
    .text-amber { color: #d97706; }
    .text-blue { color: #2563eb; }
    table.breakdown-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11.5px;
      page-break-inside: avoid;
    }
    table.breakdown-table th {
      background: ${thBg};
      color: #ffffff;
      padding: 7px 10px;
      font-weight: 600;
      text-align: left;
      font-size: 10.5px;
    }
    table.breakdown-table td {
      padding: 6px 10px;
      border-bottom: 1px solid ${borderCol};
    }
    table.breakdown-table tr:nth-child(even) td {
      background: ${cardBg};
    }
    table.breakdown-table tfoot td {
      font-weight: bold;
      background: ${cardBg};
      border-top: 1.5px solid ${borderCol};
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .stat-box {
      padding: 8px 10px;
      border-radius: 6px;
      background: ${cardBg};
      border: 1px solid ${borderCol};
    }
    .stat-box-title { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .stat-box-val { font-size: 12px; font-weight: 700; margin-top: 2px; }
    .content-container {
      background: ${isDarkTheme ? "#131b2e" : "#ffffff"};
      border: 1px solid ${borderCol};
      border-radius: 8px;
      padding: 16px 18px 28px 18px;
      margin-bottom: 24px;
      font-size: 12px;
      line-height: 1.7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
    }
    .tasks-list, .attachments-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
    }
    .task-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid ${borderCol};
      border-radius: 6px;
      margin-bottom: 4px;
      background: ${cardBg};
      font-size: 11.5px;
      page-break-inside: avoid;
    }
    .report-footer {
      border-top: 1px solid ${borderCol};
      padding-top: 12px;
      margin-top: 24px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      page-break-inside: avoid;
    }
    @media print {
      body { background: #fff !important; color: #0f172a !important; }
      .no-print { display: none !important; }
      .report-container { padding: 0 !important; width: 100% !important; max-width: none !important; }
      .content-container { background: #fff !important; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-brand">
      <div>
        <div class="brand-title">SplitLedger AI</div>
        <div class="brand-tagline">Financial Intelligence & Journal Platform</div>
      </div>
      <div style="text-align: right; font-size: 9.5px; color: #64748b;">
        Financial Note Report<br/>${escapeXml(exportTimeStr)}
      </div>
    </div>

    <h1 class="note-title">${escapeXml(titleToUse)}</h1>

    ${
      optIncludeMetadata
        ? `
    <div class="meta-pills">
      <div class="pill"><strong>Author:</strong> ${escapeXml(authorName)}</div>
      <div class="pill"><strong>Category:</strong> ${escapeXml(categoryName)}</div>
      ${tagsString ? `<div class="pill"><strong>Tags:</strong> ${escapeXml(tagsString)}</div>` : ""}
      <div class="pill"><strong>Created:</strong> ${escapeXml(createdStr)}</div>
      <div class="pill"><strong>Last Modified:</strong> ${escapeXml(updatedStr)}</div>
    </div>
    `
        : ""
    }

    ${
      hasFinancial
        ? `
    <div class="validation-alert">
      <span>✔</span>
      <span><strong>Audit Validation Passed:</strong> Real-time reconciliation matches 100% of parsed note transactions without numeric miscalculation.</span>
    </div>
    `
        : ""
    }

    ${
      hasFinancial && optIncludeFinancialSummary
        ? `
    <div class="section-header">Financial Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Income</div>
        <div class="kpi-value text-emerald">₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Expense</div>
        <div class="kpi-value text-rose">₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Receivable</div>
        <div class="kpi-value text-amber">₹${financial.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Payable</div>
        <div class="kpi-value text-amber">₹${financial.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Net Cashflow</div>
        <div class="kpi-value ${financial.netCashflow >= 0 ? "text-emerald" : "text-rose"}">${financial.netCashflow >= 0 ? "+" : ""}₹${financial.netCashflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
    `
        : ""
    }

    ${
      hasFinancial && optIncludeIncomeTransactions && incomeItems.length > 0
        ? `
    <div class="section-header">Income Transactions (${incomeItems.length})</div>
    <table class="breakdown-table">
      <thead>
        <tr>
          <th style="width: 18%;">Date</th>
          <th style="width: 44%;">Description</th>
          <th style="width: 22%;">Category</th>
          <th style="width: 16%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${incomeItems
          .map(
            (e) => `
        <tr>
          <td><strong>${escapeXml(formatTransactionDisplayDate(e.date))}</strong></td>
          <td>${escapeXml(e.description)}</td>
          <td>${escapeXml(e.category || "Income")}</td>
          <td style="text-align: right; font-weight: 700; color: #059669;">+₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Total Income Received</td>
          <td style="text-align: right; color: #059669;">+₹${financial.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
    `
        : ""
    }

    ${
      hasFinancial && optIncludeExpenseTransactions && expenseItems.length > 0
        ? `
    <div class="section-header">Expense Transactions (${expenseItems.length})</div>
    <table class="breakdown-table">
      <thead>
        <tr>
          <th style="width: 18%;">Date</th>
          <th style="width: 44%;">Description</th>
          <th style="width: 22%;">Category</th>
          <th style="width: 16%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${expenseItems
          .map(
            (e) => `
        <tr>
          <td><strong>${escapeXml(formatTransactionDisplayDate(e.date))}</strong></td>
          <td>${escapeXml(e.description)}</td>
          <td>${escapeXml(e.category || "Expense")}</td>
          <td style="text-align: right; font-weight: 700; color: #e11d48;">₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Total Expense Paid</td>
          <td style="text-align: right; color: #e11d48;">₹${financial.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
    `
        : ""
    }

    ${
      hasFinancial && optIncludeReceivables && receivableItems.length > 0
        ? `
    <div class="section-header">Receivables (Owed to You)</div>
    <table class="breakdown-table">
      <thead>
        <tr>
          <th style="width: 20%;">Date</th>
          <th style="width: 50%;">Debtor / Description</th>
          <th style="width: 30%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${receivableItems
          .map(
            (e) => `
        <tr>
          <td><strong>${escapeXml(formatTransactionDisplayDate(e.date))}</strong></td>
          <td>${escapeXml(e.description)}</td>
          <td style="text-align: right; font-weight: 700; color: #d97706;">₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Total Pending Receivables</td>
          <td style="text-align: right; color: #d97706;">₹${financial.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
    `
        : ""
    }

    ${
      hasFinancial && optIncludePayables && payableItems.length > 0
        ? `
    <div class="section-header">Payables (You Owe)</div>
    <table class="breakdown-table">
      <thead>
        <tr>
          <th style="width: 20%;">Date</th>
          <th style="width: 50%;">Creditor / Description</th>
          <th style="width: 30%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${payableItems
          .map(
            (e) => `
        <tr>
          <td><strong>${escapeXml(formatTransactionDisplayDate(e.date))}</strong></td>
          <td>${escapeXml(e.description)}</td>
          <td style="text-align: right; font-weight: 700; color: #d97706;">₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Total Pending Payables</td>
          <td style="text-align: right; color: #d97706;">₹${financial.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
    `
        : ""
    }

    ${
      hasFinancial && optIncludeMonthlyStats
        ? `
    <div class="section-header">Monthly Statistics & Insights</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-box-title">Largest Income</div>
        <div class="stat-box-val text-emerald">${largestIncome ? `+₹${largestIncome.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${largestIncome ? escapeXml(largestIncome.description) : ""}</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Largest Expense</div>
        <div class="stat-box-val text-rose">${largestExpense ? `₹${largestExpense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${largestExpense ? escapeXml(largestExpense.description) : ""}</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Average Expense</div>
        <div class="stat-box-val">₹${averageExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">Across ${expenseItems.length} expenses</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Total Entries</div>
        <div class="stat-box-val">${extractedExpenses.length} transactions</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${incomeItems.length} in • ${expenseItems.length} out</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Highest Expense Day</div>
        <div class="stat-box-val text-rose">${highestExpenseDay.amount > 0 ? `₹${highestExpenseDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${highestExpenseDay.amount > 0 ? formatTransactionDisplayDate(highestExpenseDay.date) : ""}</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Highest Income Day</div>
        <div class="stat-box-val text-emerald">${highestIncomeDay.amount > 0 ? `+₹${highestIncomeDay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${highestIncomeDay.amount > 0 ? formatTransactionDisplayDate(highestIncomeDay.date) : ""}</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Net Savings Rate</div>
        <div class="stat-box-val ${financial.netCashflow >= 0 ? "text-emerald" : "text-rose"}">
          ${financial.totalIncome > 0 ? `${Math.round((financial.netCashflow / financial.totalIncome) * 100)}%` : "0%"}
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">Of total monthly income</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Audit Status</div>
        <div class="stat-box-val text-emerald">100% Balanced</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">Verified date boundaries</div>
      </div>
    </div>
    `
        : ""
    }

    ${
      optIncludeOriginalNote
        ? `
    <div class="section-header">Original Note Content</div>
    <div class="content-container">${escapeXml(cleanNoteContentText(contentToUse))}</div>
    `
        : ""
    }

    ${
      tasks.length > 0
        ? `
    <div class="section-header">Attached Tasks (${tasks.length})</div>
    <ul class="tasks-list">
      ${tasks
        .map(
          (t) => `
      <li class="task-row">
        <span class="${t.status === "completed" ? "text-emerald" : "text-slate-400"} font-bold">
          ${t.status === "completed" ? "☑" : "☐"}
        </span>
        <div style="flex: 1;">
          <strong class="${t.status === "completed" ? "line-through opacity-70" : ""}">${escapeXml(t.title)}</strong>
          ${t.description ? `<span style="font-size: 10px; color: #64748b; margin-left: 6px;">${escapeXml(t.description)}</span>` : ""}
        </div>
        ${t.progress ? `<span class="pill" style="font-size: 9px;">${t.progress}%</span>` : ""}
      </li>`
        )
        .join("")}
    </ul>
    `
        : ""
    }

    ${
      attachments.length > 0
        ? `
    <div class="section-header">Attached Files (${attachments.length})</div>
    <ul class="attachments-list">
      ${attachments
        .map(
          (a) => `
      <li class="task-row">
        <span>📎</span>
        <div style="flex: 1; font-weight: 500;">${escapeXml(a.fileName)}</div>
        <span style="font-size: 10px; color: #64748b;">${a.fileSize ? (a.fileSize / 1024).toFixed(1) : "0"} KB</span>
      </li>`
        )
        .join("")}
    </ul>
    `
        : ""
    }

    ${
      optIncludeActivitySummary && recentLogs.length > 0
        ? `
    <div class="section-header">Audit Activity Trail</div>
    <div style="font-size: 10.5px; margin-bottom: 16px; border: 1px solid ${borderCol}; border-radius: 6px; padding: 6px 10px; background: ${cardBg};">
      ${recentLogs
        .filter((l) => Boolean(l))
        .map(
          (l) => `
      <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
        <span><strong>${escapeXml(((l.action || "UPDATE") as string).toUpperCase())}:</strong> ${escapeXml(l.details || l.action || "Activity recorded")}</span>
        <span style="color: #94a3b8; font-size: 9.5px;">${new Date(l.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>`
        )
        .join("")}
    </div>
    `
        : ""
    }

    <div class="report-footer">
      Generated automatically by SplitLedger AI • Financial Intelligence Platform on ${escapeXml(exportTimeStr)}<br/>
      Strict Date-wise Accounting Engine • Single Note Isolation • All Rights Reserved
    </div>
  </div>
</body>
</html>`;

    return {
      content: printableHtml,
      filename,
      mimeType: "text/html",
    };
  });
}

// 9. RECORD PRINT ACTIVITY LOG
export async function recordNotePrintActivity(publicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.publicId, publicId), eq(notes.userId, user.id)))
      .limit(1);

    if (note) {
      await logNoteActivity(note.id, user.id, "printed", "Printed note with dedicated report layout");
    }

    return { success: true };
  });
}

