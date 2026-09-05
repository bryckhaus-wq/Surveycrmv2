"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Clock,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  User as UserIcon,
  FileText,
} from "lucide-react";

interface TimesheetItem {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function TimesheetsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [timesheets, setTimesheets] = useState<TimesheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/timesheets");
      if (res.ok) {
        const data = await res.json();
        setTimesheets(data);
      } else {
        throw new Error("Failed to load timesheets");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load timesheet history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const handleClockIn = async () => {
    setError(null);
    setSuccess(null);
    try {
      setActionLoading(true);
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clock in");
      }

      setNotes("");
      setSuccess("Successfully clocked in.");
      await fetchTimesheets();
    } catch (err: any) {
      setError(err.message || "Failed to clock in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError(null);
    setSuccess(null);
    try {
      setActionLoading(true);
      const res = await fetch("/api/timesheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clock out");
      }

      setNotes("");
      setSuccess("Successfully clocked out.");
      await fetchTimesheets();
    } catch (err: any) {
      setError(err.message || "Failed to clock out.");
    } finally {
      setActionLoading(false);
    }
  };

  // Find if current user has an active clocked-in session
  const activeSession = timesheets.find(
    (t) => t.userId === session?.user?.id && !t.clockOut
  );

  const calculateHours = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return "Active (In Progress)";
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return `${hours.toFixed(2)} hrs`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Staff Timesheets & Time Clock</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isAdmin
              ? "View global employee time logs and active clock-in sessions."
              : "Clock in and out to record your daily shifts and working hours."}
          </p>
        </div>

        {activeSession && (
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Currently Clocked In since {new Date(activeSession.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
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

      {/* Clock Control Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <Clock className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          Shift Actions
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add shift notes (e.g. Field dispatch, Drafting job #24-102)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={actionLoading || Boolean(activeSession)}
              onClick={handleClockIn}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1.5" />
              )}
              Clock In
            </button>

            <button
              type="button"
              disabled={actionLoading || !activeSession}
              onClick={handleClockOut}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Square className="w-4 h-4 mr-1.5" />
              )}
              Clock Out
            </button>
          </div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isAdmin ? "All Staff Timesheets" : "My Timesheet History"}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {timesheets.length} total entries
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Loading timesheets...</p>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No timesheet records found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Clock in above to start recording your work hours.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  {isAdmin && <th className="py-3.5 px-4">Staff Member</th>}
                  <th className="py-3.5 px-4">Clock In</th>
                  <th className="py-3.5 px-4">Clock Out</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {timesheets.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {entry.user?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.user?.email} • {entry.user?.role?.replace("_", " ")}
                        </div>
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                      {new Date(entry.clockIn).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                      {entry.clockOut ? (
                        new Date(entry.clockOut).toLocaleString()
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                      {calculateHours(entry.clockIn, entry.clockOut)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {entry.notes || (
                        <span className="text-slate-400 dark:text-slate-600 italic">
                          No notes
                        </span>
                      )}
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
