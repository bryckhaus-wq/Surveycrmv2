"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search as SearchIcon,
  Users,
  FileText,
  ClipboardList,
  ArrowRight,
  AlertCircle,
  Loader2,
  FolderSearch,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  type: "CLIENT" | "QUOTE" | "ORDER";
  title: string;
  subtitle: string;
  link: string;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(query);
    if (query.trim()) {
      fetchResults(query.trim());
    } else {
      setResults([]);
    }
  }, [query]);

  const fetchResults = async (q: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error("Failed to load search results.");
      }
      const data: SearchResultItem[] = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const clientResults = results.filter((r) => r.type === "CLIENT");
  const quoteResults = results.filter((r) => r.type === "QUOTE");
  const orderResults = results.filter((r) => r.type === "ORDER");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & In-page Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
            <SearchIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Global Search
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Find clients, quotes, and work orders across all branches
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by client name, address, order #, phone, email, quote #..."
            className="w-full pl-11 pr-24 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-inner"
          />
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        {query && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing results for <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;{query}&rdquo;</span> ({results.length} total matches)
          </p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-medium">Searching CRM database...</p>
        </div>
      ) : !query.trim() ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FolderSearch className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Enter a Search Query
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Search across client names, contact details, project addresses, quote numbers, and work order numbers.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No Results Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No clients, quotes, or orders matched &ldquo;{query}&rdquo;. Try a different search term or check spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Orders */}
          {orderResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                  <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Work Orders ({orderResults.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {orderResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span className="hidden sm:inline mr-1">View Order</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Quotes */}
          {quoteResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>Survey Quotes ({quoteResults.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {quoteResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <span className="hidden sm:inline mr-1">View Quote</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Clients */}
          {clientResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Clients ({clientResults.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {clientResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="hidden sm:inline mr-1">View Client</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-medium">Loading search...</p>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
