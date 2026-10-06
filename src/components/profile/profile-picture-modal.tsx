"use client";

import { useState, useRef } from "react";
import NextImage from "next/image";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Camera, 
  Upload, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  Image as ImageIcon 
} from "lucide-react";
import { updateProfileAvatar, deleteProfileAvatar } from "@/actions/profile";
import { toast } from "sonner";

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  userName: string;
  onAvatarUpdated: (newAvatar: string | null) => void;
}

export function ProfilePictureModal({
  isOpen,
  onClose,
  currentAvatar,
  userName,
  onAvatarUpdated,
}: ProfilePictureModalProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (JPG, PNG, WebP)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setZoom(1);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsUploading(true);
    try {
      // In production with S3/Neon, we can upload file or persist data URI
      await updateProfileAvatar(preview);
      onAvatarUpdated(preview);
      toast.success("Profile photo updated successfully!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsUploading(true);
    try {
      await deleteProfileAvatar();
      setPreview(null);
      onAvatarUpdated(null);
      toast.success("Profile photo removed");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Profile Photo Management</DialogTitle>
          <DialogDescription className="text-xs">
            Upload, crop, zoom, and rotate your display picture (Max 5MB JPG, PNG, WebP)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          {/* Avatar Canvas / Preview */}
          <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            {preview ? (
              <NextImage
                unoptimized
                src={preview}
                alt="Profile preview"
                width={192}
                height={192}
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="h-12 w-12 mb-1 opacity-50" />
                <span className="text-xs font-semibold">No Photo</span>
              </div>
            )}
          </div>

          {/* Picture Controls (Zoom & Rotate) */}
          {preview && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-bold w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Select New Photo</span>
            </Button>

            {preview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                onClick={handleDelete}
                disabled={isUploading}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs gap-1.5 bg-primary"
            onClick={handleSave}
            disabled={!preview || isUploading}
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isUploading ? "Saving..." : "Save Picture"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
