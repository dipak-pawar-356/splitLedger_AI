"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Pin,
  CheckCircle,
  Reply,
  Trash2,
  Smile,
  CornerDownRight,
  User,
} from "lucide-react";
import {
  getNoteComments,
  addNoteComment,
  togglePinComment,
  toggleResolveComment,
  reactToComment,
  deleteComment,
} from "@/actions/notes";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface NoteCommentsWidgetProps {
  notePublicId: string;
}

const COMMON_REACTIONS = ["👍", "❤️", "🚀", "💡", "👀"];

export function NoteCommentsWidget({ notePublicId }: NoteCommentsWidgetProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await getNoteComments(notePublicId);
      setComments(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [notePublicId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addNoteComment(notePublicId, newComment.trim());
      setNewComment("");
      fetchComments();
      toast.success("Comment added!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment");
    }
  };

  const handleAddReply = async (parentId: number) => {
    if (!replyText.trim()) return;

    try {
      await addNoteComment(notePublicId, { content: replyText.trim(), parentId });
      setReplyText("");
      setReplyingToId(null);
      fetchComments();
      toast.success("Reply added!");
    } catch (err: any) {
      toast.error("Failed to post reply");
    }
  };

  const handleTogglePin = async (c: any) => {
    try {
      await togglePinComment(c.publicId);
      fetchComments();
      toast.success(c.isPinned ? "Comment unpinned" : "Comment pinned to top");
    } catch (err) {
      toast.error("Failed to update pin status");
    }
  };

  const handleToggleResolve = async (c: any) => {
    try {
      await toggleResolveComment(c.publicId);
      fetchComments();
      toast.success(c.isResolved ? "Thread marked unresolved" : "Thread resolved!");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleReaction = async (c: any, emoji: string) => {
    try {
      await reactToComment(c.publicId, emoji);
      fetchComments();
    } catch (err) {
      toast.error("Reaction failed");
    }
  };

  const handleDelete = async (publicId: string) => {
    try {
      await deleteComment(publicId);
      fetchComments();
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  // Group top-level comments and replies
  const topLevelComments = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<number, any[]>);

  return (
    <Card className="rounded-2xl border shadow-sm p-4 space-y-3.5 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Threaded Comments & Remarks
            </h4>
            <p className="text-[10px] text-slate-400">
              {comments.length} message{comments.length !== 1 ? "s" : ""} in discussion
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
          {topLevelComments.length} Threads
        </Badge>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {topLevelComments.map((c) => {
          const replies = repliesByParent[c.id] || [];
          const reactions = (c.reactions as Record<string, number>) || {};

          return (
            <div
              key={c.id}
              className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                c.isPinned
                  ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10"
                  : c.isResolved
                  ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-80"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {c.userName?.slice(0, 2).toUpperCase() || <User className="h-3.5 w-3.5" />}
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                    {c.userName || "User"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(c.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(c)}
                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                      c.isPinned ? "text-amber-500 fill-amber-500" : "text-slate-400"
                    }`}
                    title={c.isPinned ? "Unpin Comment" : "Pin Comment"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleResolve(c)}
                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                      c.isResolved ? "text-emerald-600" : "text-slate-400"
                    }`}
                    title={c.isResolved ? "Mark Unresolved" : "Resolve Thread"}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(c.publicId)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete Comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-8">
                {c.content}
              </p>

              {/* Reactions & Reply Action Bar */}
              <div className="flex items-center justify-between pl-8 pt-1 flex-wrap gap-1">
                {/* Emoji reactions */}
                <div className="flex items-center gap-1 flex-wrap">
                  {COMMON_REACTIONS.map((emoji) => {
                    const count = reactions[emoji] || 0;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(c, emoji)}
                        className={`text-[11px] px-1.5 py-0.5 rounded-full border transition-all ${
                          count > 0
                            ? "border-primary/40 bg-primary/10 text-primary font-bold"
                            : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {emoji} {count > 0 && <span className="text-[9px] font-mono">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Reply Trigger */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                  className="h-6 text-[10px] px-2 gap-1 text-slate-500 hover:text-primary"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </Button>
              </div>

              {/* Nested Replies */}
              {replies.length > 0 && (
                <div className="pl-6 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {replies.map((reply: any) => (
                    <div
                      key={reply.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="h-3 w-3 text-slate-400" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {reply.userName || "User"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(reply.publicId)}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 pl-4">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Box */}
              {replyingToId === c.id && (
                <div className="pl-6 pt-2 flex items-center gap-1.5">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddReply(c.id)}
                    placeholder={`Reply to ${c.userName}...`}
                    className="h-7 text-xs rounded-lg"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddReply(c.id)}
                    className="h-7 text-xs rounded-lg px-2.5 bg-primary"
                    disabled={!replyText.trim()}
                  >
                    Reply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingToId(null)}
                    className="h-7 text-xs rounded-lg px-2 text-slate-400"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {comments.length === 0 && !isLoading && (
          <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <MessageSquare className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-medium text-slate-600 dark:text-slate-400">No comments yet</p>
            <p className="text-[10px] text-slate-400">Share thoughts, financial context, or reminders below.</p>
          </div>
        )}
      </div>

      {/* Main Comment Input */}
      <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment or remark on this note..."
          className="h-8 text-xs rounded-xl flex-1 bg-white dark:bg-slate-900"
        />
        <Button
          type="submit"
          size="sm"
          className="h-8 text-xs rounded-xl px-3 bg-primary text-white gap-1"
          disabled={!newComment.trim()}
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Post</span>
        </Button>
      </form>
    </Card>
  );
}
