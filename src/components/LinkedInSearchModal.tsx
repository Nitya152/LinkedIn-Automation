"use client";

import { useState } from "react";
import {
  X,
  Search,
  User,
  MapPin,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { LinkedInSearchResult } from "@/types";

interface LinkedInSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  apiKey: string;
  accountId: string;
  onSelectProfile: (slug: string, profile: LinkedInSearchResult) => void;
}

export default function LinkedInSearchModal({
  isOpen,
  onClose,
  baseUrl,
  apiKey,
  accountId,
  onSelectProfile,
}: LinkedInSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LinkedInSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchError("Please enter a person's name, role, or company to search.");
      return;
    }
    if (!apiKey.trim()) {
      setSearchError("Unipile API Key is required to perform LinkedIn search.");
      return;
    }
    if (!accountId.trim()) {
      setSearchError("Unipile Account ID is required to perform LinkedIn search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey: apiKey.trim(),
          accountId: accountId.trim(),
          keywords: searchTerm.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Search failed`);
      }

      const results: LinkedInSearchResult[] = data.results || [];
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError(`No LinkedIn profiles found matching "${searchTerm}". Try a different keyword or spelling.`);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to search LinkedIn members.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: LinkedInSearchResult) => {
    const slug = result.public_identifier || result.id || "";
    setSelectedSlug(slug);
    onSelectProfile(slug, result);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700">
              <Search className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Search LinkedIn Targets by Name
              </h3>
              <p className="text-xs text-slate-500">
                Search candidates on LinkedIn via Unipile and pick a target to automate.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by full name, title, or company (e.g. Satya Nadella or VP Marketing)"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span>{isSearching ? "Searching..." : "Search"}</span>
            </button>
          </form>

          {/* Quick error or instruction banner */}
          {searchError && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Searching LinkedIn directory via Unipile...</p>
            </div>
          ) : searchResults.length === 0 && !searchError ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2 text-center">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No search executed yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Enter a target executive or lead name above to query LinkedIn in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>{searchResults.length} Profiles Found</span>
                <span className="text-[11px]">Click "Select Profile" to automate</span>
              </div>

              {searchResults.map((r, idx) => (
                <div
                  key={r.id || r.public_identifier || idx}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    selectedSlug === r.public_identifier
                      ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-2xs"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {r.profile_picture_url ? (
                      <img
                        src={r.profile_picture_url}
                        alt={r.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {r.name?.charAt(0) || "U"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {r.name}
                        </span>
                        {r.distance && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {r.distance.replace("DISTANCE_", "")} degree
                          </span>
                        )}
                      </div>

                      {r.headline && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                          {r.headline}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        {r.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{r.location}</span>
                          </span>
                        )}
                        {r.public_identifier && (
                          <span className="font-mono text-blue-600">
                            in/{r.public_identifier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {r.profile_url && (
                      <a
                        href={r.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View profile on LinkedIn"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                    >
                      {selectedSlug === r.public_identifier ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select Profile</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Search powered by Unipile LinkedIn Search API</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
