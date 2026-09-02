"use client";

import React, { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  Wrench,
  Search,
  Plus,
  Save,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Filter,
  Radio,
  Truck,
  Cpu,
  Tablet,
  Tag,
  Clock,
  Layers,
} from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Asset {
  id: string;
  assetTag: string;
  category: string;
  manufacturer: string;
  model: string;
  status: "DEPLOYABLE" | "DEPLOYED" | "MAINTENANCE" | string;
  assignedUserId: string | null;
  assignedUser?: StaffUser | null;
  notes: string | null;
  updatedAt: string;
}

export default function AssetsPage() {
  const { role } = useRole();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [assetTag, setAssetTag] = useState("");
  const [category, setCategory] = useState("GNSS / GPS Receiver");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [initialStatus, setInitialStatus] = useState("DEPLOYABLE");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);

  // Check In/Out Inline State
  const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, usersRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/admin/users"),
      ]);

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
      setError("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!assetTag.trim() || !category || !manufacturer.trim() || !model.trim()) {
      setError("Asset Tag, Category, Manufacturer, and Model are required.");
      return;
    }

    try {
      setAddingAsset(true);
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetTag: assetTag.trim(),
          category,
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          status: initialStatus,
          assignedUserId: assignedUserId || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add asset.");
      }

      setSuccess(`Equipment ${assetTag} successfully registered.`);
      setAssetTag("");
      setManufacturer("");
      setModel("");
      setNotes("");
      setAssignedUserId("");
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "An error occurred while creating equipment.");
    } finally {
      setAddingAsset(false);
    }
  };

  const handleCheckout = async (assetId: string, targetUserId: string) => {
    try {
      setUpdatingAssetId(assetId);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: targetUserId || null,
          status: targetUserId ? "DEPLOYED" : "DEPLOYABLE",
        }),
      });

      if (!res.ok) throw new Error("Failed to update checkout assignment.");
      setSuccess("Asset assignment updated.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update asset.");
    } finally {
      setUpdatingAssetId(null);
    }
  };

  const handleStatusToggle = async (assetId: string, newStatus: string) => {
    try {
      setUpdatingAssetId(assetId);
      setError(null);

      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "DEPLOYABLE" || newStatus === "MAINTENANCE"
            ? { assignedUserId: null }
            : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to update status.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    } finally {
      setUpdatingAssetId(null);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.assignedUser?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "ALL" || asset.category === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DEPLOYABLE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            DEPLOYABLE
          </span>
        );
      case "DEPLOYED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <UserCheck className="w-3 h-3 mr-1" />
            DEPLOYED
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Wrench className="w-3 h-3 mr-1" />
            MAINTENANCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {status}
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: string) => {
    if (cat.includes("GNSS") || cat.includes("GPS")) return Radio;
    if (cat.includes("Vehicle") || cat.includes("Truck")) return Truck;
    if (cat.includes("Tablet") || cat.includes("Data Collector")) return Tablet;
    return Cpu;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Survey Equipment & Asset Inventory</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track GNSS rovers, Robotic Total Stations, field data collectors, vehicles, and check-in/out status.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {showAddForm ? "Close Form" : "Add New Equipment"}
        </button>
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

      {/* Add Equipment Collapsible Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Register New Survey Equipment
            </h2>
          </div>

          <form onSubmit={handleCreateAsset} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Asset Tag / Serial # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GNSS-04 or TS-02"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="GNSS / GPS Receiver">GNSS / GPS Receiver</option>
                  <option value="Robotic Total Station">Robotic Total Station</option>
                  <option value="Field Data Collector / Tablet">Field Data Collector / Tablet</option>
                  <option value="Survey Vehicle / Truck">Survey Vehicle / Truck</option>
                  <option value="Drone / UAV LiDAR">Drone / UAV LiDAR</option>
                  <option value="Level / Optical Tool">Level / Optical Tool</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Manufacturer <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trimble, Carlson, Leica"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Model <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BRx7, R12i, TS16"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Initial Status
                </label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DEPLOYABLE">DEPLOYABLE (Ready for Field)</option>
                  <option value="DEPLOYED">DEPLOYED (Checked Out)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Calibration/Repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Crew / Staff Member
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Unassigned in Storage Locker --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notes & Calibration Dates
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calibrated Sept 2026, dual battery pack included"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingAsset}
                className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {addingAsset ? "Saving..." : "Save Equipment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by tag, manufacturer, model, or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="GNSS / GPS Receiver">GNSS / GPS</option>
              <option value="Robotic Total Station">Total Station</option>
              <option value="Field Data Collector / Tablet">Data Collector</option>
              <option value="Survey Vehicle / Truck">Vehicles</option>
              <option value="Drone / UAV LiDAR">Drones</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DEPLOYABLE">DEPLOYABLE</option>
              <option value="DEPLOYED">DEPLOYED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
            <p className="text-sm">Loading equipment inventory...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No equipment found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting your search filters."
                : "Register your first field GPS, Total Station, or Vehicle."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Asset Tag</th>
                  <th className="py-3.5 px-4">Equipment & Model</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Assigned Crew</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Check-In / Out Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssets.map((asset) => {
                  const CatIcon = getCategoryIcon(asset.category);
                  const isUpdating = updatingAssetId === asset.id;
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {asset.assetTag}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {asset.manufacturer} {asset.model}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center text-xs">
                          <CatIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {asset.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(asset.status)}
                      </td>

                      <td className="py-3.5 px-4">
                        {asset.assignedUser ? (
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                              {asset.assignedUser.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {asset.assignedUser.role.replace("_", " ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic text-xs">
                            In Storage
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {asset.notes || "-"}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          {asset.status === "DEPLOYED" ? (
                            <button
                              onClick={() => handleCheckout(asset.id, "")}
                              disabled={isUpdating}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Check In (Storage)
                            </button>
                          ) : (
                            <select
                              value={asset.assignedUserId || ""}
                              onChange={(e) => handleCheckout(asset.id, e.target.value)}
                              disabled={isUpdating}
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Check Out to...</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </option>
                              ))}
                            </select>
                          )}

                          {asset.status !== "MAINTENANCE" ? (
                            <button
                              onClick={() => handleStatusToggle(asset.id, "MAINTENANCE")}
                              disabled={isUpdating}
                              title="Send to Maintenance"
                              className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusToggle(asset.id, "DEPLOYABLE")}
                              disabled={isUpdating}
                              title="Mark Ready for Field"
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 rounded text-xs font-bold"
                            >
                              Ready
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
