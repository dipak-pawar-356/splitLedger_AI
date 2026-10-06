"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Trash2, ZoomIn, ZoomOut, RotateCw, X } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface ProfileClientProps {
  user: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export function ProfileClient({ user }: ProfileClientProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePictureUploader
              currentAvatar={user.avatar}
              userId={user.id}
              userName={user.name}
            />
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfilePictureUploader({ 
  currentAvatar, 
  userId, 
  userName 
}: { 
  currentAvatar: string | null; 
  userId: number;
  userName: string;
}) {
  const [avatar, setAvatar] = useState(currentAvatar);
  const [preview, setPreview] = useState(currentAvatar);
  const [isEditing, setIsEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setIsEditing(true);
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });
      if (response.ok) {
        setAvatar(null);
        setPreview(null);
        toast.success("Profile picture removed");
      } else {
        toast.error("Failed to remove profile picture");
      }
    } catch (error) {
      toast.error("Failed to remove profile picture");
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: preview }),
      });
      if (response.ok) {
        setAvatar(preview);
        setIsEditing(false);
        toast.success("Profile picture updated");
      } else {
        toast.error("Failed to update profile picture");
      }
    } catch (error) {
      toast.error("Failed to update profile picture");
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleRotate = () => setRotation((rotation + 90) % 360);

  return (
    <div className="space-y-4">
      <div className="relative w-48 h-48 mx-auto">
        <div
          className="w-full h-full rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-move"
          onMouseDown={handleDragStart}
          onMouseMove={handleDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {preview ? (
            <Image
              unoptimized
              src={preview}
              alt="Profile"
              width={192}
              height={192}
              className="w-full h-full object-cover transition-transform"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <span className="text-4xl font-bold">
                {userName?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button size="icon" variant="secondary" onClick={handleZoomOut} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={handleZoomIn} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={handleRotate} className="h-8 w-8">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
        {isEditing && (
          <>
            <Button onClick={handleSave}>
              <Camera className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="ghost">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </>
        )}
        {avatar && !isEditing && (
          <Button onClick={handleRemove} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
        Supports JPG, PNG, GIF up to 5MB. Drag to position, use buttons to zoom/rotate.
      </p>
    </div>
  );
}

function ProfileForm({ user }: { user: { id: number; name: string; email: string; avatar: string | null } }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled
          className="bg-slate-100 dark:bg-slate-800"
        />
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Email cannot be changed
        </p>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
