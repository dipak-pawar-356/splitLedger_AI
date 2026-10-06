"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Download,
  Trash2,
  Plus,
  Eye,
  Edit2,
  Check,
  X,
  Loader2,
  UploadCloud,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import {
  getNoteAttachments,
  renameNoteAttachment,
  deleteNoteAttachment,
} from "@/actions/notes";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface NoteAttachmentsWidgetProps {
  notePublicId: string;
}

export function NoteAttachmentsWidget({ notePublicId }: NoteAttachmentsWidgetProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  // Rename State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Preview State (Lightbox for images, Viewer for PDFs)
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await getNoteAttachments(notePublicId);
      const filesOnly = (res || []).filter((a: any) => !a.isVoiceNote);
      setAttachments(filesOnly);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [notePublicId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notePublicId", notePublicId);
      formData.append("isVoiceNote", "false");

      try {
        const res = await fetch("/api/notes/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.error("Upload error for file:", file.name, err);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully!`);
      fetchAttachments();
    } else {
      toast.error("Failed to upload file(s)");
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !replaceTargetId) return;

    const file = files[0];
    setIsUploading(true);

    try {
      // 1. Delete old attachment
      await deleteNoteAttachment(replaceTargetId);

      // 2. Upload replacement
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notePublicId", notePublicId);
      formData.append("isVoiceNote", "false");

      const res = await fetch("/api/notes/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("File replaced successfully!");
        fetchAttachments();
      } else {
        throw new Error("Upload replacement failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to replace file");
    } finally {
      setIsUploading(false);
      setReplaceTargetId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const triggerReplace = (attPublicId: string) => {
    setReplaceTargetId(attPublicId);
    replaceInputRef.current?.click();
  };

  const handleStartRename = (att: any) => {
    setEditingId(att.publicId);
    setEditingName(att.fileName);
  };

  const handleSaveRename = async (publicId: string) => {
    if (!editingName.trim()) return;
    try {
      await renameNoteAttachment(publicId, editingName.trim());
      setEditingId(null);
      fetchAttachments();
      toast.success("File renamed");
    } catch (err) {
      toast.error("Failed to rename");
    }
  };

  const handleDelete = async (publicId: string) => {
    try {
      await deleteNoteAttachment(publicId);
      fetchAttachments();
      toast.success("Attachment removed");
    } catch (err: any) {
      toast.error("Failed to delete attachment");
    }
  };

  const getFileIcon = (mimeType: string = "", fileName: string = "") => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (mimeType.includes("pdf") || ext === "pdf") {
      return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (mimeType.includes("sheet") || mimeType.includes("csv") || ["xlsx", "xls", "csv"].includes(ext)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes("zip") || ["zip", "rar", "tar", "gz"].includes(ext)) {
      return <FileArchive className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
  };

  const isImage = (att: any) => {
    const ext = att.fileName?.split(".").pop()?.toLowerCase() || "";
    return att.mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  };

  const isPdf = (att: any) => {
    const ext = att.fileName?.split(".").pop()?.toLowerCase() || "";
    return att.mimeType?.includes("pdf") || ext === "pdf";
  };

  return (
    <Card className="rounded-2xl border shadow-sm p-4 space-y-3.5 bg-card">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
      />
      <input
        ref={replaceInputRef}
        type="file"
        onChange={handleReplaceFile}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Paperclip className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Attached Files & Docs
            </h4>
            <p className="text-[10px] text-slate-400">
              {attachments.length} attachment{attachments.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Upload Files"
          className="h-7 text-xs rounded-xl px-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>Add File</span>
            </>
          )}
        </Button>
      </div>

      {/* Attachments List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {attachments.map((att) => {
          const isEditing = editingId === att.publicId;
          const imageFile = isImage(att);
          const pdfFile = isPdf(att);

          return (
            <div
              key={att.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs gap-2"
            >
              {/* File Info */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  {getFileIcon(att.mimeType, att.fileName)}
                </div>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-6 text-xs px-1.5 py-0 rounded"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(att.publicId)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        aria-label="Save file name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        aria-label="Cancel renaming"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p
                      onClick={() => (imageFile || pdfFile ? setPreviewItem(att) : null)}
                      className={`font-semibold text-xs text-slate-800 dark:text-slate-200 truncate ${
                        imageFile || pdfFile ? "cursor-pointer hover:text-primary hover:underline" : ""
                      }`}
                    >
                      {att.fileName}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{Math.round(att.fileSize / 1024)} KB</span>
                    <span>•</span>
                    <span>{formatDate(att.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Desktop Toolbar (Hidden on Mobile/Tablet) */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {(imageFile || pdfFile) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-primary"
                    onClick={() => setPreviewItem(att)}
                    title="Preview File"
                    aria-label="Preview File"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => handleStartRename(att)}
                  title="Rename"
                  aria-label="Rename File"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => triggerReplace(att.publicId)}
                  title="Replace File"
                  aria-label="Replace File"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>

                <a
                  href={att.url}
                  download={att.fileName}
                  className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0 rounded-md"
                  title="Download File"
                  aria-label="Download File"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                  onClick={() => handleDelete(att.publicId)}
                  title="Delete File"
                  aria-label="Delete File"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Mobile / Tablet Overflow Menu (⋮) - Eliminates Overlap Completely */}
              <div className="flex md:hidden items-center shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Attachment actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs p-1 min-w-[150px]">
                    {(imageFile || pdfFile) && (
                      <DropdownMenuItem
                        onClick={() => setPreviewItem(att)}
                        className="gap-2 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>View Preview</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild>
                      <a
                        href={att.url}
                        download={att.fileName}
                        className="gap-2 cursor-pointer flex items-center w-full"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        <span>Download</span>
                      </a>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleStartRename(att)}
                      className="gap-2 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Rename</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => triggerReplace(att.publicId)}
                      className="gap-2 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                      <span>Replace</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleDelete(att.publicId)}
                      className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {attachments.length === 0 && !isLoading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="py-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <UploadCloud className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-medium text-slate-600 dark:text-slate-400">No attachments uploaded</p>
            <p className="text-[10px] text-slate-400">Click to upload receipts, bills, images, or PDFs</p>
          </div>
        )}
      </div>

      {/* Lightbox / PDF Viewer Modal with Safe Header Padding to Prevent Close Overlap */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-4 flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 pr-12">
              <DialogTitle className="text-sm font-semibold truncate pr-4 max-w-[calc(100%-110px)]">
                {previewItem.fileName}
              </DialogTitle>
              <a
                href={previewItem.url}
                download={previewItem.fileName}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline shrink-0 mr-2"
                aria-label="Download Attachment"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            </DialogHeader>

            <div className="flex-1 overflow-auto py-2 flex items-center justify-center min-h-[300px]">
              {isImage(previewItem) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewItem.url}
                  alt={previewItem.fileName}
                  className="max-h-[75vh] w-auto rounded-xl object-contain shadow-md"
                />
              ) : isPdf(previewItem) ? (
                <iframe
                  src={previewItem.url}
                  className="w-full h-[70vh] rounded-xl border"
                  title={previewItem.fileName}
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium">No preview available for this format.</p>
                  <a
                    href={previewItem.url}
                    download={previewItem.fileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-xl"
                  >
                    <Download className="h-4 w-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
