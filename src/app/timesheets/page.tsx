"use client";

import React, { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  Clock,
  Calendar,
  ClipboardList,
  User,
  Plus,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

interface TimesheetItem {
  id: string;
  date: string;
  hours: string | number;
  workType: string;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  order: {
    id: string;
    orderNumber: string;
    clientName: string;
    address: string;
    status: string;
    surveyType?: { id: string; name: string } | null;
  };
}

interface OrderOption {
  id: string;
  orderNumber: string;
  clientName: string;
  address: string;
  status: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export default function TimesheetsPage() {
  const { role } = useRole();

  const [timesheets, setTimesheets] = useState<TimesheetItem[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [orderId, setOrderId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [hours, setHours] = useState<string>("8.0");
  const [workType, setWorkType] = useState<string>("Field");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [tsRes, ordersRes, usersRes] = await Promise.all([
        fetch("/api/timesheets"),
        fetch("/api/orders"),
        fetch("/api/admin/users"),
      ]);

      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTimesheets(tsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const ordersList = Array.isArray(ordersData) ? ordersData : ordersData.orders || [];
        setOrders(ordersList);
        if (ordersList.length > 0 && !orderId) {
          setOrderId(ordersList[0].id);
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
        if (usersData.length > 0 && !userId) {
          setUserId(usersData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load timesheet data:", err);
      setError("Failed to load initial data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!orderId || !userId || !date || !hours || !workType) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userId,
          date,
          hours: parseFloat(hours),
          workType,
          notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to log timesheet hours.");
      }

      setSuccess("Timesheet hours successfully recorded.");
      setNotes("");

      // Refresh list
      const updatedRes = await fetch("/api/timesheets");
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setTimesheets(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while logging hours.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalLoggedHours = timesheets.reduce(
    (acc, curr) => acc + Number(curr.hours || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Staff Timesheets & Labor Tracking</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Log labor hours for Field Crews, CAD Drafting, and Surveyor Review connected directly to PostgreSQL.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider">
              Total Logged
            </span>
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
              {totalLoggedHours.toFixed(1)} hrs
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Log Hours Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Log Work Hours</h2>
        </div>

        <form onSubmit={handleLogHours} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Work Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Order */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Work Order <span className="text-rose-500">*</span>
              </label>
              {orders.length > 0 ? (
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.clientName} ({o.address})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  No orders available yet.
                </div>
              )}
            </div>

            {/* Staff / Specialist */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Specialist / Staff <span className="text-rose-500">*</span>
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Hours Worked <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Work Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Work Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Field">Field Work (Surveying / GPS)</option>
                <option value="Drafting">Drafting (CAD / Plats)</option>
                <option value="Admin">Admin / Research / Review</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Activity Notes / Description
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Staked boundary corners, set rear monument pins, drafted preliminary plat..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || orders.length === 0}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Logging Hours..." : "Record Timesheet"}
            </button>
          </div>
        </form>
      </div>

      {/* Timesheet Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Logged Timesheets</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {timesheets.length} entries
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
            <p className="text-sm">Loading timesheets...</p>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No timesheets logged yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Use the form above to record staff labor on active work orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Specialist</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Client & Address</th>
                  <th className="py-3.5 px-4">Work Category</th>
                  <th className="py-3.5 px-4">Hours</th>
                  <th className="py-3.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {timesheets.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {entry.user.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.user.role.replace("_", " ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {entry.order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {entry.order.clientName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.order.address}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          entry.workType === "Field"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : entry.workType === "Drafting"
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {entry.workType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {Number(entry.hours).toFixed(2)} hrs
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {entry.notes || <span className="text-slate-400 dark:text-slate-600 italic">No notes</span>}
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
