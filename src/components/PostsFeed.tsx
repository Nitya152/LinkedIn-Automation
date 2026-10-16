"use client";

import { useState } from "react";
import {
  FileText,
  ThumbsUp,
  MessageSquare,
  Share2,
  Send,
  Check,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { PostItem, AutomationConfig } from "@/types";

interface PostsFeedProps {
  posts: PostItem[];
  config: AutomationConfig;
}

export default function PostsFeed({ posts, config }: PostsFeedProps) {
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});
  const [isSubmittingReaction, setIsSubmittingReaction] = useState<Record<string, boolean>>({});
  const [actionFeedbacks, setActionFeedbacks] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualReaction = async (
    postId: string,
    reactionType: AutomationConfig["reactionType"] = "like"
  ) => {
    setIsSubmittingReaction((prev) => ({ ...prev, [postId]: true }));
    setActionFeedbacks((prev) => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          accountId: config.accountId,
          postId,
          reactionType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit reaction");
      }

      setActionFeedbacks((prev) => ({
        ...prev,
        [postId]: {
          type: "success",
          message: `Reacted with "${reactionType}"!`,
        },
      }));
    } catch (err: any) {
      setActionFeedbacks((prev) => ({
        ...prev,
        [postId]: {
          type: "error",
          message: err.message || "Failed to react",
        },
      }));
    } finally {
      setIsSubmittingReaction((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleManualComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setIsSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    setActionFeedbacks((prev) => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });

    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          accountId: config.accountId,
          postId,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment");
      }

      setActionFeedbacks((prev) => ({
        ...prev,
        [postId]: {
          type: "success",
          message: `Comment published successfully!`,
        },
      }));

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setActiveCommentPostId(null);
    } catch (err: any) {
      setActionFeedbacks((prev) => ({
        ...prev,
        [postId]: {
          type: "error",
          message: err.message || "Failed to comment",
        },
      }));
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-xs font-semibold text-slate-700">Posts Feed</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Posts fetched from the target profile will appear here sorted by <code className="text-blue-600 font-mono">parsed_datetime</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Fetched Posts Feed ({posts.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono text-[11px]">
          Sorted newest first
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {posts.map((post, index) => {
          const isLatest = index === 0;
          const feedback = actionFeedbacks[post.social_id];
          const isCommenting = isSubmittingComment[post.social_id];
          const isReacting = isSubmittingReaction[post.social_id];
          const showCommentBox = activeCommentPostId === post.social_id;

          const formattedDate = post.parsed_datetime
            ? new Date(post.parsed_datetime).toLocaleString()
            : post.date || "Unknown date";

          return (
            <div
              key={post.social_id || index}
              className={`rounded-xl border bg-white p-5 transition-all shadow-xs ${
                isLatest
                  ? "border-blue-300 ring-1 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Header: Author & Date & Latest Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  {post.author?.profile_picture_url ? (
                    <img
                      src={post.author.profile_picture_url}
                      alt={post.author.name || "Author"}
                      className="h-7 w-7 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600">
                      {(post.author?.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      {post.author?.name || "LinkedIn Author"}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLatest && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      Latest Post (Target of Automation)
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                    #{index + 1}
                  </span>
                </div>
              </div>

              {/* Social ID bar */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-md px-2.5 py-1 border border-slate-200 font-mono text-[11px] text-slate-700 mb-2.5">
                <span className="truncate">
                  <span className="text-slate-400">social_id: </span>
                  <span className="font-medium text-slate-800">{post.social_id}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyId(post.social_id)}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 flex-shrink-0"
                >
                  {copiedId === post.social_id ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Post Text */}
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto mb-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                {post.text || (
                  <span className="italic text-slate-400">
                    No text content (media/link/reshare post)
                  </span>
                )}
              </div>

              {/* Stats & Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                {/* Engagement Counters */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />
                    <span>{post.like_count ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{post.comment_count ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{post.repost_count ?? 0}</span>
                  </span>
                </div>

                {/* Manual Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReacting || post.permissions?.can_react === false}
                    onClick={() =>
                      handleManualReaction(
                        post.social_id,
                        config.reactionType && config.reactionType !== "none" ? config.reactionType : "like"
                      )
                    }
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 text-blue-600 ${isReacting ? "animate-spin" : ""}`} />
                    <span>
                      {isReacting
                        ? "Reacting..."
                        : `Like (${
                            config.reactionType && config.reactionType !== "none"
                              ? config.reactionType
                              : "like"
                          })`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={post.permissions?.can_post_comments === false}
                    onClick={() => setActiveCommentPostId(showCommentBox ? null : post.social_id)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{showCommentBox ? "Cancel" : "Comment"}</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`mt-2.5 p-2 rounded-md text-xs flex items-center gap-1.5 border ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Expandable Manual Comment Box */}
              {showCommentBox && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write your manual comment for this post..."
                      value={commentInputs[post.social_id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.social_id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleManualComment(post.social_id);
                        }
                      }}
                      className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isCommenting || !commentInputs[post.social_id]?.trim()}
                      onClick={() => handleManualComment(post.social_id)}
                      className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isCommenting ? "..." : "Send"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
