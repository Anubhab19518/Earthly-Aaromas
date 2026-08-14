"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const { error } = await addComment(entityType, entityId, newComment);
    if (!error) {
      setNewComment("");
    } else {
      // In a real app, you might show a toast notification here
      alert("Failed to add comment");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-[#DFE1E6] mt-4 mb-8">
      <h3 className="text-[16px] font-medium text-[#172B4D] flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#5E6C84]" />
        Comments
      </h3>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[12px] font-bold shrink-0 mt-1">
              {comment.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#172B4D]">{comment.user.name}</span>
                <span className="text-[12px] text-[#5E6C84]">
                  {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <div className="text-[14px] text-[#172B4D] bg-[#FAFBFC] p-3 rounded-[3px] border border-[#DFE1E6] whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-[14px] text-[#5E6C84] italic">
            No comments yet. Be the first to add one!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 items-start pt-4">
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full text-[14px] p-3 border border-[#DFE1E6] rounded-[3px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-all resize-y min-h-[80px]"
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#0052CC] text-white text-[14px] font-medium rounded-[3px] hover:bg-[#0047B3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
