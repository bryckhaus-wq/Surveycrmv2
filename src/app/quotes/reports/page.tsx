"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSpoke } from "@/context/SpokeContext";
import {
  Calendar,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Building2,
  Users,
  MapPin,
  Loader2,
} from "lucide-react";

interface GroupStats {
  name: string;
  quotes: number;
  quoteAmt: number;
  won: number;
  wonAmt: number;
  lost: number;
  lostAmt: number;
  open: number;
  openAmt: number;
  winRate: number;
}

export default function QuotesReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { spokeId } = useSpoke();

  // Date state defaults to past 30 days
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [globalConversionRate, setGlobalConversionRate] = useState<number>(0);
  const [clientStats, setClientStats] = useState<GroupStats[]>([]);
  const [spokeStats, setSpokeStats] = useState<GroupStats[]>([]);
  const [marketerStats, setMarketerStats] = useState<GroupStats[]>([]);
  const [spokeTotal, setSpokeTotal] = useState<GroupStats | null>(null);
  const [marketerTotal, setMarketerTotal] = useState<GroupStats | null>(null);
  const [clientTotal, setClientTotal] = useState<GroupStats | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchReports = async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (spokeId) params.append("spokeId", spokeId);

      const res = await fetch(`/api/quotes/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch report analytics.");
      }

      const data = await res.json();
      setGlobalConversionRate(data.globalConversionRate ?? 0);
      setClientStats(data.clientStats || []);
      setSpokeStats(data.spokeStats || []);
      setMarketerStats(data.marketerStats || []);
      setSpokeTotal(data.spokeTotal || null);
      setMarketerTotal(data.marketerTotal || null);
      setClientTotal(data.clientTotal || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, spokeId, status, session]);

  if (status === "loading" || (status === "authenticated" && session?.user?.role !== "ADMIN")) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm font-medium">Verifying authorization...</p>
      </div>
    );
  }

  const formatAmt = (amt: number) => {
    return Math.round(amt || 0).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/quotes"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Quote Performance & Conversion Reports
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Aggregated conversion metrics across Clients, Regional Spokes, and Marketers.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchReports}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-800 dark:text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column CSS Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Client Panel (col-span-12 lg:col-span-7) */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Client Aggregation</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {clientStats.length} Clients
            </span>
          </div>

          {/* Independent Scrollable Table Wrapper */}
          <div className="overflow-x-auto overflow-y-auto max-h-[750px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800/90 shadow-sm backdrop-blur-sm">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Client</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Quotes</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Quote Amt</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Won</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Won Amt</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost Amt</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Open</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Open Amt</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Loading client data...
                    </td>
                  </tr>
                ) : clientStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                      No quotes found for selected date range.
                    </td>
                  </tr>
                ) : (
                  clientStats.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[140px] truncate" title={item.name}>
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{item.quotes}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatAmt(item.quoteAmt)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{item.won}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmt(item.wonAmt)}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{item.lost}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{formatAmt(item.lostAmt)}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{item.open}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{formatAmt(item.openAmt)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {item.winRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {clientTotal && clientStats.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-bold uppercase">{clientTotal.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{clientTotal.quotes}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatAmt(clientTotal.quoteAmt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{clientTotal.won}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatAmt(clientTotal.wonAmt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{clientTotal.lost}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatAmt(clientTotal.lostAmt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{clientTotal.open}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatAmt(clientTotal.openAmt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black">{clientTotal.winRate}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Vertical Stack of Three Cards (col-span-12 lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Card 1: Conversion Rate Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-center">
                Conversion Rate
              </h3>
            </div>
            <div className="p-6 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {globalConversionRate} %
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Overall Quotes Won to Total Quotes Ratio
              </p>
            </div>
          </div>

          {/* Card 2: Spoke Aggregation Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Spoke</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {spokeStats.length} Branches
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3 whitespace-nowrap">Spoke</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Quotes</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Quote Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Won</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Won Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Open</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Open Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {spokeStats.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-slate-400 italic">
                        No spoke activity recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    spokeStats.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{item.quotes}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatAmt(item.quoteAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{item.won}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmt(item.wonAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{item.lost}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{formatAmt(item.lostAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{item.open}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{formatAmt(item.openAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {item.winRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {spokeTotal && spokeStats.length > 0 && (
                  <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-bold uppercase">{spokeTotal.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{spokeTotal.quotes}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatAmt(spokeTotal.quoteAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{spokeTotal.won}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatAmt(spokeTotal.wonAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{spokeTotal.lost}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatAmt(spokeTotal.lostAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{spokeTotal.open}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatAmt(spokeTotal.openAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black">{spokeTotal.winRate}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Card 3: Marketer Aggregation Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Marketer</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {marketerStats.length} Marketers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3 whitespace-nowrap">Marketer</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Quotes</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Quote Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Won</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Won Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lost Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Open</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Open Amt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {marketerStats.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-slate-400 italic">
                        No marketer activity recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    marketerStats.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{item.quotes}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatAmt(item.quoteAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{item.won}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmt(item.wonAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{item.lost}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{formatAmt(item.lostAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{item.open}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{formatAmt(item.openAmt)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {item.winRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {marketerTotal && marketerStats.length > 0 && (
                  <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-bold uppercase">{marketerTotal.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{marketerTotal.quotes}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatAmt(marketerTotal.quoteAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{marketerTotal.won}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatAmt(marketerTotal.wonAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{marketerTotal.lost}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatAmt(marketerTotal.lostAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{marketerTotal.open}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatAmt(marketerTotal.openAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black">{marketerTotal.winRate}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
