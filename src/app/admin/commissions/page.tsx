"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

interface MarketerReportItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  spoke?: { id: string; name: string; shortName: string } | null;
  commissionRate: number;
  completedJobsCount: number;
  totalRevenue: number;
  commissionOwed: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    clientName: string;
    status: string;
    createdAt: string;
    quote?: { id: string; quoteNumber: number; price: number | string } | null;
  }>;
}

interface ReportTotals {
  totalMarketers: number;
  totalCompletedJobs: number;
  totalRevenueGenerated: number;
  totalCommissionsOwed: number;
}

export default function MarketerCommissionsPage() {
  // Default date window: Current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<ReportTotals>({
    totalMarketers: 0,
    totalCompletedJobs: 0,
    totalRevenueGenerated: 0,
    totalCommissionsOwed: 0,
  });
  const [marketers, setMarketers] = useState<MarketerReportItem[]>([]);
  const [expandedMarketerId, setExpandedMarketerId] = useState<string | null>(null);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/commissions?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load marketer commissions data.");
      }

      const data = await res.json();
      setTotals(data.totals || {});
      setMarketers(data.marketers || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load commissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [startDate, endDate]);

  const toggleExpand = (id: string) => {
    setExpandedMarketerId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Marketer Commission & Payroll Calculator</span>
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Calculate accurate payout allocations and commission balances for completed client work orders.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Period:</label>
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
            onClick={fetchCommissions}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            title="Refresh Commission Data"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commission Payout Owed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Payout Owed
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
            ${totals.totalCommissionsOwed?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For all completed work in period
          </p>
        </div>

        {/* Total Revenue Generated */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Total Revenue Generated
            </span>
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
            ${totals.totalRevenueGenerated?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gross completed job value
          </p>
        </div>

        {/* Total Completed Jobs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Completed Orders
            </span>
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
            {totals.totalCompletedJobs}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Delivered survey orders
          </p>
        </div>

        {/* Active Marketers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Marketer Staff
            </span>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-950/60 rounded-xl text-cyan-600 dark:text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
            {totals.totalMarketers}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered sales professionals
          </p>
        </div>
      </div>

      {/* Main Commissions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Marketer Payroll & Commission Summary</span>
          </h2>
          <span className="text-xs text-slate-500">
            Showing {marketers.length} marketers
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Calculating commission payroll...
          </div>
        ) : marketers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No active marketers registered in the system. Add users with role `MARKETER` in Admin panel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4">Marketer Name & Email</th>
                  <th className="py-3 px-4">Assigned Branch</th>
                  <th className="py-3 px-4 text-center">Completed Jobs</th>
                  <th className="py-3 px-4 text-right">Revenue Generated</th>
                  <th className="py-3 px-4 text-center">Commission Rate</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">Total Payout Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {marketers.map((m) => {
                  const isExpanded = expandedMarketerId === m.id;
                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        onClick={() => toggleExpand(m.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {m.orders.length > 0 && (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{m.name}</div>
                          <div className="text-[11px] text-slate-400">{m.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          {m.spoke ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {m.spoke.shortName} - {m.spoke.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Global / None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-xs">
                            {m.completedJobsCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                          ${m.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {m.commissionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                          ${m.commissionOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* Expanded Orders Breakdown */}
                      {isExpanded && m.orders.length > 0 && (
                        <tr className="bg-slate-50/50 dark:bg-slate-950/40">
                          <td colSpan={7} className="p-4 pl-12">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                Attributed Completed Orders Breakdown ({m.orders.length})
                              </h4>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                                    <th className="py-2">Order #</th>
                                    <th className="py-2">Client</th>
                                    <th className="py-2">Completed Date</th>
                                    <th className="py-2 text-right">Job Price</th>
                                    <th className="py-2 text-right">Commission ({m.commissionRate}%)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {m.orders.map((ord) => {
                                    const jobPrice = ord.quote?.price ? Number(ord.quote.price) : 0;
                                    const comm = jobPrice * (m.commissionRate / 100);
                                    return (
                                      <tr key={ord.id}>
                                        <td className="py-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                                          <Link href={`/orders/${ord.id}`} className="hover:underline">
                                            {ord.orderNumber}
                                          </Link>
                                        </td>
                                        <td className="py-2 text-slate-800 dark:text-slate-200">{ord.clientName}</td>
                                        <td className="py-2 text-slate-500">
                                          {new Date(ord.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 text-right font-medium">
                                          ${jobPrice.toFixed(2)}
                                        </td>
                                        <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                          ${comm.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
