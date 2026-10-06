"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Edit2, 
  Smile, 
  Clock, 
  Check, 
  X,
  CornerDownRight 
} from "lucide-react";
import { createComment, updateComment, deleteComment } from "@/actions/comments";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface CommentItem {
  id: number;
  userId: number;
  userName?: string | null;
  userAvatar?: string | null;
  content: string;
  reactions?: Record<string, number> | any;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface TransactionCommentsProps {
  transactionId: number;
  transactionPublicId: string;
  initialComments: CommentItem[];
  currentUserId: number;
}

export function TransactionComments({
  transactionId,
  transactionPublicId,
  initialComments,
  currentUserId,
}: TransactionCommentsProps) {
  const router = useRouter();
  const [commentsList, setCommentsList] = useState<CommentItem[]>(initialComments);
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createComment({
        transactionId,
        content: newContent.trim(),
      });

      toast.success("Comment posted");
      setNewContent("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editingContent.trim()) return;

    try {
      await updateComment(commentId, { content: editingContent.trim() });
      toast.success("Comment updated");
      setEditingCommentId(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update comment");
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await deleteComment(commentId);
      toast.success("Comment deleted");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Discussion & Comments</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
            {initialComments.length}
          </span>
        </div>
      </div>

      {/* Add Comment Box */}
      <form onSubmit={handleAddComment} className="space-y-3">
        <Textarea
          placeholder="Add a comment, note, or discuss this expense..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="min-h-[80px] rounded-xl text-sm"
        />
        <div className="flex items-center justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !newContent.trim()}
            className="rounded-xl px-4 text-xs font-semibold gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {initialComments.map((comment) => {
          const isOwn = comment.userId === currentUserId;
          const isEditing = editingCommentId === comment.id;

          return (
            <div
              key={comment.id}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={comment.userAvatar || undefined} />
                    <AvatarFallback className="text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {comment.userName ? comment.userName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {comment.userName || "User"}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                </div>

                {isOwn && !isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingContent(comment.content);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[60px] text-xs rounded-xl"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-lg"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs rounded-lg"
                      onClick={() => handleSaveEdit(comment.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-9 whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
            </div>
          );
        })}

        {initialComments.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            No comments yet. Start the conversation above!
          </div>
        )}
      </div>
    </div>
  );
}
