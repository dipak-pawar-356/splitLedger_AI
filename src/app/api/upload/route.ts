import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import {
  validateUpload,
  validateUploadFolder,
  validateBufferMagicBytes,
  generateSecureUploadFilename,
} from "@/lib/security/upload-guard";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // 1. Rate limiting
    assertRateLimit(`upload:${user.id}`, RATE_LIMITS.uploads.receipts);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // 2. Validate folder name against whitelist to prevent directory traversal
    const safeFolder = validateUploadFolder(rawFolder);

    // 3. Validate file metadata, blocked extensions, and size limit
    const validation = validateUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "File validation failed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Verify buffer magic bytes against declared MIME type to stop MIME spoofing
    const isMagicValid = validateBufferMagicBytes(buffer, file.type);
    if (!isMagicValid) {
      return NextResponse.json(
        { success: false, error: "File content does not match its reported MIME type or contains unsafe content." },
        { status: 400 }
      );
    }

    // 5. Cloudinary remote storage (Production)
    if (isCloudinaryConfigured()) {
      const cloudinaryFolder = `splitledger/${safeFolder}`;
      const uploadResult = await uploadToCloudinary(buffer, {
        folder: cloudinaryFolder,
        resourceType: "auto",
      });

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        provider: "cloudinary",
      });
    }

    // 6. Local uploads directory with high-entropy randomized filenames
    const uniqueFilename = generateSecureUploadFilename(file.name);
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);

    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);

    const localUrl = `/uploads/${safeFolder}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: localUrl,
      provider: "local",
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    const clientErr = maskErrorForClient(error);
    return NextResponse.json(clientErr, { status: error.statusCode || 500 });
  }
}
