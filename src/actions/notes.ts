"use server";

import { db, withDbRetry } from "@/lib/db";
import { notes, noteCategories, noteVersions, noteLinks, noteChecklists, noteReminders, noteAttachments, noteShares, noteComments, noteActivityLogs, transactions, users, dailyJournals } from "@/lib/db/schema/schema";
import { eq, and, or, ilike, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { generatePublicId, formatDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";

function calculateStatsText(content: string) {
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const chars = plainText.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return { plainText, words, chars, readingTime };
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
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

    const [dup] = await db
      .insert(notes)
      .values({
        publicId: newPublicId,
        userId: user.id,
        categoryId: original.categoryId,
        title: `${original.title} (Copy)`,
        content: original.content,
        plainText: original.plainText,
        color: original.color,
        tags: original.tags,
        isDraft: original.isDraft,
        isPinned: false,
        isFavorite: original.isFavorite,
        version: 1,
        wordCount: original.wordCount,
        characterCount: original.characterCount,
        readingTime: original.readingTime,
      })
      .returning();

    await db.insert(noteVersions).values({
      publicId: generatePublicId("nver"),
      noteId: dup.id,
      versionNumber: 1,
      editedBy: user.id,
      title: dup.title,
      content: dup.content,
      summary: `Duplicated from ${original.title}`,
    });

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
      .select()
      .from(notes)
      .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return [];

    return await db
      .select()
      .from(noteVersions)
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

    return await updateNote(notePublicId, {
      title: ver.title,
      content: ver.content,
      createVersion: true,
      versionSummary: `Restored version ${ver.versionNumber}`,
    });
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
    const targetDateStr = dateStr || new Date().toISOString().split("T")[0];

    // Compute metrics from transactions for targetDateStr
    const allTxns = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), eq(transactions.isDeleted, false)));

    let income = 0;
    let expense = 0;
    let receivable = 0;
    let payable = 0;
    const matchingTxns: any[] = [];
    const txList = Array.isArray(allTxns) ? allTxns : [];

    for (const t of txList) {
      const dStr = new Date(t.date).toISOString().split("T")[0];
      if (dStr === targetDateStr) {
        matchingTxns.push(t);
        const amt = (t.amount || 0) / 100;
        if (t.type === "received" || t.type === "repaid") {
          income += amt;
        } else if (t.type === "lent") {
          receivable += amt;
        } else if (t.type === "borrowed") {
          payable += amt;
        } else {
          expense += amt;
        }
      }
    }

    const net = income - expense;

    // Fetch notes created or updated on targetDateStr
    const allNotes = await db
      .select({
        id: notes.id,
        publicId: notes.publicId,
        title: notes.title,
        plainText: notes.plainText,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        categoryName: noteCategories.name,
      })
      .from(notes)
      .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
      .where(and(eq(notes.userId, user.id), or(eq(notes.isDeleted, false), isNull(notes.isDeleted))));

    const matchingNotes = allNotes.filter((n) => {
      const cDate = new Date(n.createdAt).toISOString().split("T")[0];
      return cDate === targetDateStr;
    });

    // Fetch saved reflection for this date
    const [journalReflection] = await db
      .select()
      .from(dailyJournals)
      .where(and(eq(dailyJournals.userId, user.id), eq(dailyJournals.date, targetDateStr)))
      .limit(1);

    return {
      date: targetDateStr,
      income,
      expense,
      receivable,
      payable,
      net,
      txCount: matchingTxns.length,
      transactions: matchingTxns,
      notesCount: matchingNotes.length,
      notes: matchingNotes,
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
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.publicId, taskPublicId))
      .limit(1);

    if (!existing) throw new Error("Task not found");

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
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.publicId, taskPublicId))
      .limit(1);

    if (!existing) throw new Error("Task not found");

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
      .select()
      .from(noteChecklists)
      .where(eq(noteChecklists.publicId, taskPublicId))
      .limit(1);

    if (!existing) throw new Error("Task not found");

    await db.delete(noteChecklists).where(eq(noteChecklists.id, existing.id));
    safeRevalidatePath("/dashboard/notes");
    return { success: true };
  });
}

export async function reorderNoteTasks(notePublicId: string, orderedPublicIds: string[]) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    for (let i = 0; i < orderedPublicIds.length; i++) {
      await db
        .update(noteChecklists)
        .set({ order: i })
        .where(eq(noteChecklists.publicId, orderedPublicIds[i]));
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
      .select()
      .from(noteComments)
      .where(eq(noteComments.publicId, commentPublicId))
      .limit(1);

    if (!cmt) throw new Error("Comment not found");

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
      .select()
      .from(noteComments)
      .where(eq(noteComments.publicId, commentPublicId))
      .limit(1);

    if (!cmt) throw new Error("Comment not found");

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
      .select()
      .from(noteComments)
      .where(eq(noteComments.publicId, commentPublicId))
      .limit(1);

    if (!cmt) throw new Error("Comment not found");

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

// 8. DOCUMENT EXPORT (PDF, TXT, Markdown, CSV, JSON)
export async function exportNoteDocument(format: "pdf" | "txt" | "markdown" | "csv" | "json", notePublicId: string) {
  const user = await requireAuth();

  return await withDbRetry(async () => {
    const note = await getNoteById(notePublicId);
    if (!note) throw new Error("Note not found");

    const titleSlug = (note.title || "Untitled_Note").replace(/[^a-zA-Z0-9]/g, "_");
    const dateSlug = new Date().toISOString().split("T")[0];
    const filename = `${titleSlug}_SplitLedger_AI_${dateSlug}.${format === "markdown" ? "md" : format}`;

    if (format === "json") {
      return {
        content: JSON.stringify(note, null, 2),
        filename,
        mimeType: "application/json",
      };
    }

    if (format === "txt" || format === "markdown") {
      const textContent = `# ${note.title}\n\nCreated: ${formatDate(note.createdAt)}\nReading Time: ${note.readingTime} min\nWords: ${note.wordCount}\n\n${note.plainText}`;
      return {
        content: textContent,
        filename,
        mimeType: "text/plain",
      };
    }

    if (format === "csv") {
      const csvContent = `"ID","Title","WordCount","ReadingTime","CreatedAt"\n"${note.publicId}","${note.title}","${note.wordCount}","${note.readingTime}","${formatDate(note.createdAt)}"`;
      return {
        content: csvContent,
        filename,
        mimeType: "text/csv",
      };
    }

    // Default Printable HTML / PDF Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${note.title} - SplitLedger AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
    .header { border-b: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px 0; font-size: 26px; }
    .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .content { font-size: 14px; line-height: 1.6; }
    .footer { margin-top: 40px; border-t: 1px solid #e2e8f0; pt: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${note.title}</h1>
    <div class="meta">
      Created: ${formatDate(note.createdAt)} | Category: ${note.categoryName || "General"} | Words: ${note.wordCount} | Reading Time: ${note.readingTime} min
    </div>
  </div>
  <div class="content">
    ${note.content}
  </div>
  <div class="footer">
    Generated by SplitLedger AI • Personal Financial Journal
  </div>
</body>
</html>`;

    return {
      content: htmlContent,
      filename,
      mimeType: "text/html",
    };
  });
}

