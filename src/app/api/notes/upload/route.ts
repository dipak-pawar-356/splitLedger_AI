import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { notes, noteAttachments, noteActivityLogs } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { generatePublicId } from "@/lib/utils";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const notePublicId = formData.get("notePublicId") as string | null;
    const isVoice = formData.get("isVoiceNote") === "true";
    const durationSeconds = formData.get("durationSeconds")
      ? parseInt(formData.get("durationSeconds") as string, 10)
      : null;
    const waveformRaw = formData.get("waveform") as string | null;
    const customName = formData.get("fileName") as string | null;

    if (!file || !notePublicId) {
      return NextResponse.json({ error: "File and notePublicId are required" }, { status: 400 });
    }

    return await withDbRetry(async () => {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.publicId, notePublicId), eq(notes.userId, user.id)))
        .limit(1);

      if (!note) {
        return NextResponse.json({ error: "Note not found or access denied" }, { status: 404 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const originalName = customName || file.name || (isVoice ? `Voice_Recording_${timestamp}.webm` : "attachment");
      const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueFilename = `${timestamp}_${cleanName}`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "notes");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(filePath, buffer);

      const url = `/uploads/notes/${uniqueFilename}`;
      const publicId = generatePublicId("natt");

      let waveformData = null;
      if (waveformRaw) {
        try {
          waveformData = JSON.parse(waveformRaw);
        } catch (_) {}
      }

      const [attachment] = await db
        .insert(noteAttachments)
        .values({
          publicId,
          noteId: note.id,
          userId: user.id,
          fileName: originalName,
          fileSize: file.size || buffer.length,
          mimeType: file.type || (isVoice ? "audio/webm" : "application/octet-stream"),
          url,
          isVoiceNote: isVoice,
          durationSeconds: durationSeconds || null,
          waveform: waveformData,
        })
        .returning();

      const logPublicId = generatePublicId("nlog");
      await db.insert(noteActivityLogs).values({
        publicId: logPublicId,
        noteId: note.id,
        userId: user.id,
        action: isVoice ? "voice_note_recorded" : "attachment_uploaded",
        details: isVoice
          ? `Recorded voice note (${durationSeconds || 0}s)`
          : `Uploaded file: ${originalName} (${Math.round((file.size || buffer.length) / 1024)} KB)`,
      });

      return NextResponse.json({ success: true, attachment }, { status: 201 });
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
