"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Printer,
  Calendar,
  Loader2,
  AlertCircle,
  Receipt,
  TrendingUp,
  FileCheck2,
  Building,
} from "lucide-react";

interface BillingOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  address: string;
  status: string;
  surveyPrice: number;
  miscAmt: number;
  discountAmt: number;
  depositPaid: number;
  finalPaymentReceived: number;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
  }>;
  completionDate?: string | null;
  createdAt: string;
}

interface BillingData {
  baseFee: number;
  monthlyRevenue: number;
  feePercentage: number;
  variableFee: number;
  totalOwed: number;
  month: number;
  year: number;
  ordersCount: number;
  orders: BillingOrder[];
}

export default function PlatformBillingPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = [
    currentDate.getFullYear() - 2,
    currentDate.getFullYear() - 1,
    currentDate.getFullYear(),
    currentDate.getFullYear() + 1,
  ];

  useEffect(() => {
    fetchBilling();
  }, [selectedMonth, selectedYear]);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/admin/billing?month=${selectedMonth}&year=${selectedYear}`
      );
      if (!res.ok) {
        throw new Error("Failed to load billing statement");
      }
      const data: BillingData = await res.json();
      setBillingData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred fetching billing statement.");
    } finally {
      setLoading(false);
    }
  };

  const selectedMonthName =
    months.find((m) => m.value === selectedMonth)?.label || `Month ${selectedMonth}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Header & Controls (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Platform Royalty & Billing
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly platform software license and variable royalty fee payout calculations.
            </p>
          </div>
        </div>

        {/* Action Buttons: Print Statement */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Period Filter Card (Hidden on Print) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Select Billing Period:
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm print:hidden">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm font-medium">Calculating platform statement...</p>
        </div>
      ) : billingData ? (
        <div className="space-y-6">
          {/* Printable Statement Document */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Statement Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6 print:border-black">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                    M
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                    Platform License & Royalty Payout
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Billing Period: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedMonthName} {selectedYear}</span>
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                  Statement Generated
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Issued: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            {/* Read-Only Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Base Fee */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Base Platform Fee
                </span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                  ${billingData.baseFee.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  Fixed monthly software license
                </span>
              </div>

              {/* Total Revenue */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  System Revenue (Paid)
                </span>
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  ${billingData.monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  Total job payments collected
                </span>
              </div>

              {/* Variable Royalty */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Variable Royalty ({billingData.feePercentage}%)
                </span>
                <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                  ${billingData.variableFee.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  {billingData.feePercentage}% of collected revenue
                </span>
              </div>

              {/* Total Owed */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                  Total Amount Due
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  ${billingData.totalOwed.toFixed(2)}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                  Base ($500) + Royalty (${billingData.variableFee.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Itemized Calculation Summary Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                Monthly Payout Breakdown
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 font-bold uppercase tracking-wider">Description</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">Rate / Formula</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                        Monthly Core SaaS Platform License
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        Flat monthly retainer
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ${billingData.baseFee.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                        Software Royalty Fee
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {billingData.feePercentage}% × ${billingData.monthlyRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ${billingData.variableFee.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-900 dark:border-slate-100">
                      <td colSpan={2} className="py-3 font-black text-sm text-slate-900 dark:text-slate-100 uppercase">
                        Total Payout Due
                      </td>
                      <td className="py-3 text-right font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                        ${billingData.totalOwed.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contributing Orders Table */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Contributing Orders ({billingData.ordersCount})
                </h3>
              </div>

              {billingData.orders.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                  No orders recorded for this billing cycle.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Order #</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Client</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Status</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Deposit</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Final Paid</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Total Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {billingData.orders.map((o) => {
                        const totalCollected =
                          o.payments && o.payments.length > 0
                            ? o.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                            : (Number(o.depositPaid) || 0) + (Number(o.finalPaymentReceived) || 0);
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {o.orderNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                              {o.clientName}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                {o.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ${(Number(o.depositPaid) || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ${(Number(o.finalPaymentReceived) || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ${totalCollected.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Remittance Note on Statement */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Payment Terms: Net 15 from statement date.
              </p>
              <p>
                Calculations derived from total deposit and final collections processed through the CRM platform.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
