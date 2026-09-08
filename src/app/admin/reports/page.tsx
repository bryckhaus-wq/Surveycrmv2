"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Building2,
  Clock,
  Award,
  RefreshCw,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ExternalLink,
  ShieldAlert,
  Users,
  Activity,
  Calendar,
  CheckCircle2,
  CalendarRange,
  X,
  Filter,
} from "lucide-react";

interface ARAgingOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientEmail?: string | null;
  totalPrice: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  createdAt: string;
  estimatedDelivery?: string | null;
}

interface HoldOrder {
  id: string;
  orderNumber: string;
  status: string;
  clientName: string;
  clientEmail?: string | null;
  estimatedDelivery?: string | null;
  createdAt: string;
}

interface SpokeUtilizationItem {
  id: string;
  name: string;
  shortName: string;
  dailyCapacity: number;
  activeOrdersCount: number;
  isOverCapacity: boolean;
  utilizationRate: number;
}

interface LaborTimesheetItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  clockIn: string;
  clockOut?: string | null;
  notes?: string | null;
}

interface VIPClientItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  clientType: string;
  totalOrders: number;
}

interface ReportsResponse {
  arAging: ARAgingOrder[];
  holds: HoldOrder[];
  spokeUtilization: SpokeUtilizationItem[];
  laborLogs: LaborTimesheetItem[];
  vipClients: VIPClientItem[];
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Tab State: Accounts Receivable, On Hold, Crew Capacity, Labor Logs, VIP Clients
  const [activeTab, setActiveTab] = useState<string>("AR");

  // Date Range Filter State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportsResponse>({
    arAging: [],
    holds: [],
    spokeUtilization: [],
    laborLogs: [],
    vipClients: [],
  });

  // Client-side authentication & authorization check: redirect non-admin users back to /dashboard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const fetchReportsData = async (start = appliedStartDate, end = appliedEndDate) => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);

      const url = `/api/admin/reports${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to load unified admin reports data.");
      }
      const json: ReportsResponse = await res.json();
      setData({
        arAging: json.arAging || [],
        holds: json.holds || [],
        spokeUtilization: json.spokeUtilization || [],
        laborLogs: json.laborLogs || [],
        vipClients: json.vipClients || [],
      });
    } catch (err: any) {
      console.error("Reports fetch error:", err);
      setError(err.message || "Failed to load reports data.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateRange = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    fetchReportsData(startDate, endDate);
  };

  const handleClearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    fetchReportsData("", "");
  };

  const setPreset = (preset: "today" | "7d" | "30d" | "month" | "year") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    let startStr = "";

    if (preset === "today") {
      startStr = todayStr;
    } else if (preset === "7d") {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      startStr = d.toISOString().split("T")[0];
    } else if (preset === "30d") {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      startStr = d.toISOString().split("T")[0];
    } else if (preset === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = d.toISOString().split("T")[0];
    } else if (preset === "year") {
      const d = new Date(now.getFullYear(), 0, 1);
      startStr = d.toISOString().split("T")[0];
    }

    setStartDate(startStr);
    setEndDate(todayStr);
    setAppliedStartDate(startStr);
    setAppliedEndDate(todayStr);
    fetchReportsData(startStr, todayStr);
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchReportsData("", "");
    }
  }, [status, session]);

  // Group labor timesheet data by userId
  const groupedLabor = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string;
        userRole: string;
        totalShifts: number;
        totalHours: number;
      }
    >();

    for (const ts of data.laborLogs) {
      if (!map.has(ts.userId)) {
        map.set(ts.userId, {
          userId: ts.userId,
          userName: ts.userName,
          userEmail: ts.userEmail,
          userRole: ts.userRole,
          totalShifts: 0,
          totalHours: 0,
        });
      }

      const staff = map.get(ts.userId)!;
      staff.totalShifts += 1;

      if (ts.clockIn) {
        const start = new Date(ts.clockIn).getTime();
        const end = ts.clockOut ? new Date(ts.clockOut).getTime() : Date.now();
        const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
        staff.totalHours += durationHours;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [data.laborLogs]);

  // Calculated Totals
  const totalBalanceDue = useMemo(() => {
    return data.arAging.reduce((sum, item) => sum + item.balanceDue, 0);
  }, [data.arAging]);

  const totalActiveHolds = data.holds.length;

  const totalLaborHours = useMemo(() => {
    return groupedLabor.reduce((sum, item) => sum + item.totalHours, 0);
  }, [groupedLabor]);

  if (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium">Verifying administrator authorization...</p>
      </div>
    );
  }

  const tabs = [
    {
      id: "AR",
      name: "Accounts Receivable",
      icon: DollarSign,
      count: data.arAging.length,
      badgeColor: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
    },
    {
      id: "HOLDS",
      name: "On Hold",
      icon: AlertTriangle,
      count: data.holds.length,
      badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
    },
    {
      id: "CAPACITY",
      name: "Crew Capacity",
      icon: Building2,
      count: data.spokeUtilization.length,
      badgeColor: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
    },
    {
      id: "LABOR",
      name: "Labor Logs",
      icon: Clock,
      count: groupedLabor.length,
      badgeColor: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
    },
    {
      id: "VIP",
      name: "VIP Clients",
      icon: Award,
      count: data.vipClients.length,
      badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Unified Management & Operational Reports</span>
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time multi-dimensional view of outstanding receivables, held jobs, branch capacity, staff timesheet hours, and key client volume.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchReportsData()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <CalendarRange className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Filter by Date Range
            </span>
            {(appliedStartDate || appliedEndDate) && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Active: {appliedStartDate || "Start"} → {appliedEndDate || "Present"}
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1 font-medium">Presets:</span>
            <button
              type="button"
              onClick={() => setPreset("today")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset("7d")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset("30d")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset("month")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPreset("year")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              This Year
            </button>
          </div>
        </div>

        {/* Date Inputs Form */}
        <form onSubmit={handleApplyDateRange} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto sm:mt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Apply Range
            </button>
            {(appliedStartDate || appliedEndDate || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateRange}
                className="inline-flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg transition-colors"
                title="Clear date range"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* A/R Aging Total */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Outstanding A/R
            </span>
            <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono block">
            ${totalBalanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {data.arAging.length} active orders with unpaid balance
          </p>
        </div>

        {/* Orders on Hold */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Orders On Hold
            </span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
            {totalActiveHolds}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pending client action, deposit, access, or final payment
          </p>
        </div>

        {/* 30-Day Labor Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {appliedStartDate || appliedEndDate ? "Labor Hours (Range)" : "Labor Hours (30 Days)"}
            </span>
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono block">
            {totalLaborHours.toFixed(1)} hrs
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Logged across {groupedLabor.length} team members
          </p>
        </div>

        {/* Top VIP Client */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Top VIP Client
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 truncate block">
            {data.vipClients[0]?.name || "None yet"}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {data.vipClients[0]
              ? `${data.vipClients[0].totalOrders} lifetime orders booked`
              : "No client orders recorded"}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-800 dark:text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-1.5">
        <div className="flex flex-wrap gap-1.5 border-b border-transparent">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : tab.badgeColor
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* TAB 1: ACCOUNTS RECEIVABLE */}
        {activeTab === "AR" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Accounts Receivable & Aging Balances</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Orders in progress or delivered with an outstanding unpaid balance due.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {data.arAging.length} orders requiring collection
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading accounts receivable...
              </div>
            ) : data.arAging.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No outstanding accounts receivable found. All active jobs are fully paid.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total Price</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {data.arAging.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          <Link
                            href={`/orders/${order.id}`}
                            className="hover:underline flex items-center space-x-1"
                          >
                            <span>{order.orderNumber}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {order.clientName}
                          </div>
                          {order.clientEmail && (
                            <div className="text-[11px] text-slate-400">{order.clientEmail}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                            {order.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          ${order.totalPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ${order.amountPaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20">
                          ${order.balanceDue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                        Total Outstanding Balance
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${data.arAging.reduce((s, o) => s + o.totalPrice, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${data.arAging.reduce((s, o) => s + o.amountPaid, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                        ${totalBalanceDue.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ON HOLD */}
        {activeTab === "HOLDS" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>Orders Currently On Hold</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Active survey jobs flagged with hold statuses requiring intervention or follow-up.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {data.holds.length} jobs on hold
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading hold orders...
              </div>
            ) : data.holds.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No orders are currently on hold.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Hold Status</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Estimated Delivery Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {data.holds.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          <Link
                            href={`/orders/${order.id}`}
                            className="hover:underline flex items-center space-x-1"
                          >
                            <span>{order.orderNumber}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {order.clientName}
                          </div>
                          {order.clientEmail && (
                            <div className="text-[11px] text-slate-400">{order.clientEmail}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {order.estimatedDelivery ? (
                            <span className="inline-flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {order.estimatedDelivery}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not scheduled</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            Review Job
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CREW CAPACITY */}
        {activeTab === "CAPACITY" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Regional Spoke Branch Crew Capacity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily branch workload vs configured capacity limits.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {data.spokeUtilization.length} active branches
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading branch capacity...
              </div>
            ) : data.spokeUtilization.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                No active spoke branches configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Spoke Name</th>
                      <th className="py-3 px-4 text-center">Active Orders Count</th>
                      <th className="py-3 px-4 text-center">Daily Capacity</th>
                      <th className="py-3 px-4">Capacity Utilization</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {data.spokeUtilization.map((spoke) => {
                      const isOver = spoke.activeOrdersCount >= spoke.dailyCapacity;
                      const pct = Math.min(100, spoke.utilizationRate);
                      return (
                        <tr
                          key={spoke.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isOver ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-300">
                                {spoke.shortName}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {spoke.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                            <span
                              className={`inline-block px-3 py-1 rounded-full ${
                                isOver
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {spoke.activeOrdersCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                            {spoke.dailyCapacity} jobs/day
                          </td>
                          <td className="py-3.5 px-4 w-64">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold">
                                <span className={isOver ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-600 dark:text-slate-400"}>
                                  {spoke.utilizationRate}% Capacity
                                </span>
                                <span className="text-slate-400 font-mono">
                                  {spoke.activeOrdersCount} / {spoke.dailyCapacity}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOver
                                      ? "bg-rose-600 dark:bg-rose-500"
                                      : pct > 75
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isOver ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Over Capacity
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Healthy Capacity
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LABOR LOGS */}
        {activeTab === "LABOR" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Staff Labor Logs {appliedStartDate || appliedEndDate ? `(${appliedStartDate || "Start"} to ${appliedEndDate || "Present"})` : "(Past 30 Days)"}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Shift counts and accumulated clocked hours grouped by staff member.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {groupedLabor.length} active staff members
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Aggregating labor logs...
              </div>
            ) : groupedLabor.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                No timesheet records logged for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Total Shifts (30d)</th>
                      <th className="py-3 px-4 text-right">Total Hours Logged (30d)</th>
                      <th className="py-3 px-4 text-right">Avg Hours / Shift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {groupedLabor.map((staff) => {
                      const avgPerShift =
                        staff.totalShifts > 0
                          ? staff.totalHours / staff.totalShifts
                          : 0;
                      return (
                        <tr
                          key={staff.userId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {staff.userName}
                            </div>
                            <div className="text-[11px] text-slate-400">{staff.userEmail}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                              {staff.userRole.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                              {staff.totalShifts}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                            {staff.totalHours.toFixed(1)} hrs
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {avgPerShift.toFixed(1)} hrs/shift
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 uppercase tracking-wider">
                        Total Staff Labor (Past 30 Days)
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {data.laborLogs.length} shifts
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                        {totalLaborHours.toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {data.laborLogs.length > 0
                          ? (totalLaborHours / data.laborLogs.length).toFixed(1)
                          : "0.0"}{" "}
                        hrs/shift
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VIP CLIENTS */}
        {activeTab === "VIP" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>VIP Clients Leaderboard (Top 10)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Highest volume repeat clients ranked by total lifetime completed and active orders.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Top 10 client accounts
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading VIP client leaderboard...
              </div>
            ) : data.vipClients.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                No client accounts found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-14">Rank</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Client Type</th>
                      <th className="py-3 px-4 text-right">Total Lifetime Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {data.vipClients.map((client, idx) => {
                      const rank = idx + 1;
                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`w-7 h-7 inline-flex items-center justify-center rounded-full font-mono font-bold text-xs ${
                                rank === 1
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                                  : rank === 2
                                  ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
                                  : rank === 3
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            <Link
                              href={`/clients/${client.id}`}
                              className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                            >
                              <span>{client.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                            {client.email}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {client.clientType || "Direct"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {client.totalOrders} orders
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
