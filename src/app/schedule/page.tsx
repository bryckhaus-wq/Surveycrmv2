"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";

interface SpokeItem {
  id: string;
  name: string;
  shortName: string;
  dailyCapacity: number;
}

interface ScheduledOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  fieldDueDate: string;
  surveyType: { id: string; name: string };
  assignedUser?: { id: string; name: string; role: string; email: string } | null;
  spoke?: { id: string; name: string; shortName: string } | null;
  client?: { id: string; name: string; clientType: string } | null;
}

export default function SchedulePage() {
  const [spokes, setSpokes] = useState<SpokeItem[]>([]);
  const [selectedSpoke, setSelectedSpoke] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [scheduleData, setScheduleData] = useState<{
    capacity: number;
    schedule: Record<
      string,
      {
        date: string;
        count: number;
        capacity: number;
        orders: ScheduledOrder[];
      }
    >;
    orders: ScheduledOrder[];
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpokes();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [startDate, selectedSpoke]);

  const fetchSpokes = async () => {
    try {
      const res = await fetch("/api/admin/spokes");
      if (res.ok) {
        const data = await res.json();
        setSpokes(data);
      }
    } catch (err) {
      console.error("Failed to load spokes:", err);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      endDate.setHours(23, 59, 59, 999);

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const params = new URLSearchParams({
        startDate: startStr,
        endDate: endStr,
        spokeId: selectedSpoke,
      });

      const res = await fetch(`/api/schedule?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load schedule data.");
      }
      const data = await res.json();
      setScheduleData(data);

      // Auto-select first day or keep selection if still in range
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      if (!selectedDate || !days.includes(selectedDate)) {
        setSelectedDate(days[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching schedule.");
    } finally {
      setLoading(false);
    }
  };

  const fourteenDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return {
        dateObj: d,
        dateStr,
        dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }),
        formattedDate: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        isToday:
          new Date().toISOString().split("T")[0] === dateStr,
      };
    });
  }, [startDate]);

  const handlePrev14Days = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - 14);
    setStartDate(newStart);
  };

  const handleNext14Days = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + 14);
    setStartDate(newStart);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const selectedDayOrders = useMemo(() => {
    if (!selectedDate || !scheduleData?.schedule) return [];
    return scheduleData.schedule[selectedDate]?.orders || [];
  }, [selectedDate, scheduleData]);

  const getCapacityColor = (count: number, capacity: number) => {
    if (count > capacity) {
      return {
        text: "text-red-500 dark:text-red-400",
        bg: "bg-red-500",
        border: "border-red-300 dark:border-red-800",
        cardBg: "bg-red-50/50 dark:bg-red-950/20",
        badge: "bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        label: "Overbooked",
      };
    }
    if (count >= capacity * 0.75) {
      return {
        text: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500",
        border: "border-amber-300 dark:border-amber-800",
        cardBg: "bg-amber-50/40 dark:bg-amber-950/20",
        badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        label: "Near Capacity",
      };
    }
    return {
      text: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500",
      border: "border-emerald-300 dark:border-emerald-800",
      cardBg: "bg-emerald-50/30 dark:bg-emerald-950/10",
      badge: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      label: "Available",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Production Schedule
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                14-Day Multi-Spoke Field Capacity & Work Order Schedule
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Spoke Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
              Branch:
            </span>
            <select
              value={selectedSpoke}
              onChange={(e) => setSelectedSpoke(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches (Global Capacity)</option>
              {spokes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} - {s.name} ({s.dailyCapacity} max/day)
                </option>
              ))}
            </select>
          </div>

          {/* Date Pagination Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-1">
            <button
              onClick={handlePrev14Days}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous 14 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext14Days}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Next 14 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchSchedule}
            disabled={loading}
            className="p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* 14-Day Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center">
            <CalendarCheck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            14-Day Capacity Timeline (
            {fourteenDays[0].formattedDate} – {fourteenDays[13].formattedDate})
          </h2>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400">Available</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400">Near Limit</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400">Overbooked</span>
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {fourteenDays.map((day) => {
            const dayData = scheduleData?.schedule[day.dateStr];
            const count = dayData?.count || 0;
            const capacity = dayData?.capacity || scheduleData?.capacity || 15;
            const pct = Math.min(Math.round((count / capacity) * 100), 100);
            const color = getCapacityColor(count, capacity);
            const isSelected = selectedDate === day.dateStr;

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 relative flex flex-col justify-between min-h-[115px] ${
                  isSelected
                    ? "ring-2 ring-blue-500 border-blue-500 shadow-md bg-blue-50/50 dark:bg-blue-950/30"
                    : `${color.cardBg} ${color.border} hover:shadow-sm`
                }`}
              >
                {/* Header: Day & Date */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {day.dayOfWeek}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-600 text-white rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                    {day.formattedDate}
                  </div>
                </div>

                {/* Body: Capacity numbers & Progress Bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${color.text}`}>
                      {count} / {capacity} Jobs
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color.bg} transition-all duration-300 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Order Detail View */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Scheduled Field Orders for{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedDayOrders.length} work order
                {selectedDayOrders.length === 1 ? "" : "s"} scheduled for field operations
              </p>
            </div>

            {scheduleData && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Branch Capacity Status:
                </span>
                {(() => {
                  const dayData = scheduleData.schedule[selectedDate];
                  const count = dayData?.count || 0;
                  const capacity = dayData?.capacity || scheduleData.capacity || 15;
                  const color = getCapacityColor(count, capacity);
                  return (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${color.badge}`}
                    >
                      {count} / {capacity} Jobs ({color.label})
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Orders Table or Empty State */}
          {selectedDayOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Field Orders Scheduled
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You can assign field due dates to orders from the Orders page.
              </p>
              <Link
                href="/orders"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Orders
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-4 rounded-l-lg">Order #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Property Address</th>
                    <th className="py-3 px-4">Survey Type</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDayOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ord.clientName}
                        </div>
                        {ord.client?.clientType && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ord.client.clientType}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div>{ord.address}</div>
                        <div className="text-xs text-slate-400">
                          {ord.city}, {ord.state} {ord.zip}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {ord.surveyType?.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {ord.spoke ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {ord.spoke.shortName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {ord.assignedUser ? (
                          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span>{ord.assignedUser.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Compass className="w-3 h-3 mr-1" />
                          {ord.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          Manage
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
    </div>
  );
}
