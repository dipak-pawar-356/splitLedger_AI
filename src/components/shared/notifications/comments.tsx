"use client";

import { useState } from "react";
import { Send, MessageSquare, Reply, Trash2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
}

interface CommentsProps {
  entityType: "transaction" | "settlement" | "group";
  entityId: number;
  comments?: Comment[];
  onAddComment?: (content: string, parentId?: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function Comments({
  entityType,
  entityId,
  comments = [],
  onAddComment,
  onDeleteComment,
}: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment?.(newComment);
      setNewComment("");
    }
  };

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim() && replyTo) {
      onAddComment?.(replyContent, replyTo);
      setReplyContent("");
      setReplyTo(null);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? "ml-8 mt-3" : ""} p-4 bg-slate-50 dark:bg-slate-900 rounded-lg`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {comment.userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm">{comment.userName}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onDeleteComment?.(comment.id)}
        >
          <Trash2 className="h-3 w-3 text-slate-600 dark:text-slate-400" />
        </Button>
      </div>
      <p className="text-sm mb-2">{comment.content}</p>
      {!isReply && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReply(comment.id)}
          className="text-xs"
        >
          <Reply className="h-3 w-3 mr-1" />
          Reply
        </Button>
      )}
      {replyTo === comment.id && (
        <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
          <Button type="submit" size="sm">
            <Send className="h-3 w-3" />
          </Button>
        </form>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold">Comments</h3>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            ({comments.length})
          </span>
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
            />
            <Button type="submit">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
          {comments.length === 0 && (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
