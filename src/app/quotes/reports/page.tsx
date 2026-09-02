"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSpoke } from "@/context/SpokeContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Percent,
  Briefcase,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface ReportTotals {
  totalQuotes: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  commissionableCount: number;
  totalWonAmount: number;
  totalQuotedAmount: number;
}

interface ReportPercentages {
  wonPercentage: number;
  lostPercentage: number;
  openPercentage: number;
}

interface ChartItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface FollowUpQuote {
  id: string;
  quoteNumber: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number | string;
  status: string;
  createdAt: string;
  surveyType?: { id: string; name: string };
  csr?: { id: string; name: string; email: string } | null;
  marketer?: { id: string; name: string; email: string } | null;
}

const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6"];

export default function QuotesReportsPage() {
  const { spokeId } = useSpoke();

  // Date state default to past 30 days
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<ReportTotals>({
    totalQuotes: 0,
    wonCount: 0,
    lostCount: 0,
    openCount: 0,
    commissionableCount: 0,
    totalWonAmount: 0,
    totalQuotedAmount: 0,
  });
  const [percentages, setPercentages] = useState<ReportPercentages>({
    wonPercentage: 0,
    lostPercentage: 0,
    openPercentage: 0,
  });
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [followUpQuotes, setFollowUpQuotes] = useState<FollowUpQuote[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchReports = async () => {
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
      setTotals(data.totals || {});
      setPercentages(data.percentages || {});
      setChartData(data.chartData || []);
      setFollowUpQuotes(data.followUpQuotes || []);
      setStatusCounts(data.statusCounts || {});
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, spokeId]);

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Date Picker */}
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
            Analyze win/loss ratios, commissionable volume, and actionable open follow-ups.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Won */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Jobs Won
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {totals.wonCount}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({percentages.wonPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Won Revenue: <span className="font-semibold text-slate-800 dark:text-slate-200">${totals.totalWonAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Total Lost */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Jobs Lost
            </span>
            <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {totals.lostCount}
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              ({percentages.lostPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Closed/Declined proposals
          </p>
        </div>

        {/* Total Commissionable Jobs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Total Commissionable Jobs
            </span>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-950/60 rounded-lg text-cyan-600 dark:text-cyan-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {totals.commissionableCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              marketer assigned
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attributed to marketing & sales
          </p>
        </div>

        {/* Total Quotes Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Total Quoted Value
            </span>
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ${totals.totalQuotedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across {totals.totalQuotes} total estimates
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Won vs Lost vs Open */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
            <span>Quote Win / Loss / Open Distribution</span>
            <span className="text-xs font-normal text-slate-500">By Count & Ratio</span>
          </h2>

          <div className="h-72 w-full flex items-center justify-center">
            {mounted && totals.totalQuotes > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} Quotes`, name]}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                No quote proposals recorded in selected date range.
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
              Conversion Performance Summary
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block mr-1.5" />
                    Won Proposals ({totals.wonCount})
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">{percentages.wonPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentages.wonPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-600 dark:text-rose-400 flex items-center">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block mr-1.5" />
                    Lost Proposals ({totals.lostCount})
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">{percentages.lostPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentages.lostPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-600 dark:text-blue-400 flex items-center">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block mr-1.5" />
                    Open / Follow-Up Needed ({totals.openCount})
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">{percentages.openPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentages.openPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Quotes Processed:</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{totals.totalQuotes}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 block">Total Commission Pipeline:</span>
              <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">{totals.commissionableCount} orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Follow-Up Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quotes Needing Client Follow-Up</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Open and pending estimates requiring sales touchpoint ({followUpQuotes.length} total)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading follow-up quotes...
          </div>
        ) : followUpQuotes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No open quotes requiring follow-up in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Address / City</th>
                  <th className="py-3 px-4">Survey Type</th>
                  <th className="py-3 px-4">Quoted Amount</th>
                  <th className="py-3 px-4">Assigned CSR</th>
                  <th className="py-3 px-4">Marketer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {followUpQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      #{q.quoteNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{q.clientName}</div>
                      {q.clientEmail && (
                        <div className="text-[11px] text-slate-400">{q.clientEmail}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div>{q.address}</div>
                      <div className="text-[11px] text-slate-400">{q.city}, {q.state}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {q.surveyType?.name || "Standard Survey"}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      ${Number(q.price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {q.csr ? q.csr.name : <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4">
                      {q.marketer ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                          {q.marketer.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Direct</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded text-xs font-semibold transition-colors"
                      >
                        View
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
