"use client";

import { useState } from "react";
import { User, Copy, Check, ExternalLink, ShieldCheck, MapPin, Briefcase } from "lucide-react";
import { ProfileInfo } from "@/types";

interface ProfileCardProps {
  profile: ProfileInfo | null | undefined;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const [copied, setCopied] = useState(false);

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center">
        <User className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-xs font-semibold text-slate-700">Profile Intelligence</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          The target profile will be resolved in Step 1 to extract the canonical <code className="text-blue-600 font-mono">provider_id</code>.
        </p>
      </div>
    );
  }

  const handleCopyProviderId = () => {
    if (profile.provider_id) {
      navigator.clipboard.writeText(profile.provider_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDistanceBadge = (dist?: string) => {
    switch (dist) {
      case "FIRST_DEGREE":
      case "DISTANCE_1":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">1st Degree</span>;
      case "SECOND_DEGREE":
      case "DISTANCE_2":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">2nd Degree</span>;
      case "THIRD_DEGREE":
      case "DISTANCE_3":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">3rd Degree</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">{dist || "Out of Network"}</span>;
    }
  };

  const getRelationshipBadge = () => {
    if (profile.is_relationship) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          1st-Degree Connected
        </span>
      );
    }
    if (profile.invitation?.status === "PENDING") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Invitation Pending
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Not Connected
      </span>
    );
  };

  const publicUrl = profile.public_identifier
    ? `https://www.linkedin.com/in/${profile.public_identifier}`
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Resolved Target Profile
        </h3>
        <div className="flex items-center gap-1.5">
          {getDistanceBadge(profile.network_distance)}
          {getRelationshipBadge()}
        </div>
      </div>

      <div className="flex items-start gap-3.5">
        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={profile.name || "Target Profile"}
              className="h-14 w-14 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold border border-blue-200">
              {profile.name ? profile.name.slice(0, 2).toUpperCase() : "LI"}
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {profile.name || "LinkedIn User"}
            </h4>

            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
              >
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {profile.headline && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {profile.headline}
            </p>
          )}

          {profile.location && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span>{profile.location}</span>
            </p>
          )}
        </div>
      </div>

      {/* Copyable Provider ID badge */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex-shrink-0">
            Provider ID:
          </span>
          <code className="text-xs font-mono text-slate-700 font-medium truncate">
            {profile.provider_id}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopyProviderId}
          className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 transition-colors flex-shrink-0"
          title="Copy provider_id"
        >
          {copied ? (
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
    </div>
  );
}
