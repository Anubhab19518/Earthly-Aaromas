"use client";

import { useState, useTransition, useRef, useEffect, KeyboardEvent } from "react";
import { MessageSquare, Send, Loader2, CornerDownLeft, Sparkles, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { addComment, EntityType } from "../services/comments.actions";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface CommentSectionProps {
  entityType: EntityType;
  entityId: string;
  comments: Comment[];
}

export function CommentSection({ entityType, entityId, comments }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  const handleCancel = () => {
    setNewComment("");
    setIsFocused(false);
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!newComment.trim()) return;

    startTransition(async () => {
      setErrorMsg(null);
      const result = await addComment(entityType, entityId, newComment.trim());
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setNewComment("");
        setIsFocused(false);
      }
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200" ref={containerRef}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-semibold text-slate-900">Activity & Comments</h3>
          <span className="flex h-4.5 px-1.5 items-center justify-center rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
            {comments.length}
          </span>
        </div>
      </div>

      {/* 1. Jira-Style Add Comment Box */}
      <div className="space-y-2">
        <div className="flex gap-2.5 items-start">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5 shadow-2xs">
            <User className="h-3.5 w-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            {!isFocused && !newComment ? (
              <div
                onClick={() => setIsFocused(true)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 px-3 py-1.5 text-xs text-slate-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <span>Add a comment or update for the team...</span>
                <span className="text-[10px] font-mono text-slate-400 border border-slate-200/80 px-1 py-0.2 rounded bg-white">
                  M
                </span>
              </div>
            ) : (
              <div className="rounded-md border border-blue-500 bg-white shadow-xs overflow-hidden transition-all animate-in fade-in duration-150">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    setErrorMsg(null);
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    } else if (e.key === "Escape" && !newComment.trim()) {
                      handleCancel();
                    }
                  }}
                  placeholder="Write your comment... (Use ⌘+Enter to submit)"
                  className="w-full p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-y min-h-[84px] font-sans"
                  disabled={isPending}
                />

                {errorMsg && (
                  <div className="px-3 py-1 bg-rose-50 text-[11px] text-rose-600 border-t border-rose-100">
                    {errorMsg}
                  </div>
                )}

                {/* Bottom Toolbar & Action Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50/70 border-t border-slate-100 text-xs">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span>Press</span>
                    <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-600 shadow-2xs">
                      ⌘ + Enter
                    </kbd>
                    <span>to submit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="rounded px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isPending || !newComment.trim()}
                      className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <span>Save</span>
                          <CornerDownLeft className="h-3 w-3 opacity-70" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Comments Stream */}
      <div className="space-y-3 pt-1">
        {comments.map((comment) => {
          const dateObj = new Date(comment.createdAt);
          const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
          const fullDate = format(dateObj, "MMM d, yyyy 'at' h:mm a");

          return (
            <div key={comment.id} className="flex gap-2.5 items-start group">
              {/* User Avatar */}
              <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                {comment.user.name.charAt(0).toUpperCase()}
              </div>

              {/* Comment Content Card */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {comment.user.name}
                  </span>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-400" title={fullDate}>
                    {timeAgo}
                  </span>
                </div>

                <div className="text-xs text-slate-800 bg-white p-3 rounded-md border border-slate-200/90 shadow-2xs whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </div>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && !isFocused && (
          <div className="py-6 text-center text-slate-400 text-xs">
            <p className="font-medium text-slate-600">No comments yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Be the first to share notes or update the team on this purchase order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
