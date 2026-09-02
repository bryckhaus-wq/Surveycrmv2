"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import { Role } from "@prisma/client";
import ReactGoogleAutocomplete from "react-google-autocomplete";
import {
  ShieldAlert,
  Users,
  Building2,
  Plus,
  Trash2,
  DollarSign,
  Mail,
  User,
  AlertCircle,
  Lock,
  CheckCircle2,
  XCircle,
  MapPin,
  Compass,
  Navigation,
  FileSpreadsheet,
} from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  spokeId?: string | null;
  spoke?: { id: string; name: string; shortName: string } | null;
  _count?: {
    assignedQuotes: number;
    assignedOrders: number;
  };
}

interface SpokeItem {
  id: string;
  name: string;
  shortName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lbNumber?: string | null;
  dailyCapacity: number;
  _count?: {
    users: number;
    quotes: number;
    orders: number;
    assets: number;
  };
}

interface SurveyType {
  id: string;
  name: string;
  defaultPrice: string | number;
  includedFeatures?: string[] | null;
  excludedFeatures?: string[] | null;
  _count?: {
    quotes: number;
    orders: number;
  };
}

export default function AdminPage() {
  const { role } = useRole();

  // Staff State
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>(Role.CSR);
  const [newUserSpokeId, setNewUserSpokeId] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserLatitude, setNewUserLatitude] = useState<number | null>(null);
  const [newUserLongitude, setNewUserLongitude] = useState<number | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Spokes / Branches State
  const [spokes, setSpokes] = useState<SpokeItem[]>([]);
  const [newSpokeName, setNewSpokeName] = useState("");
  const [newSpokeShort, setNewSpokeShort] = useState("");
  const [newSpokeLb, setNewSpokeLb] = useState("");
  const [newSpokeCapacity, setNewSpokeCapacity] = useState("15");
  const [newSpokeCity, setNewSpokeCity] = useState("");
  const [newSpokeState, setNewSpokeState] = useState("");
  const [addingSpoke, setAddingSpoke] = useState(false);
  const [spokeError, setSpokeError] = useState<string | null>(null);

  // Survey Types State
  const [surveyTypes, setSurveyTypes] = useState<SurveyType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([
    "Boundary monument recovery and verification",
    "Field measurement of property lines",
    "Certified stamped & signed PDF survey plat",
  ]);
  const [newInclusionInput, setNewInclusionInput] = useState("");
  const [exclusions, setExclusions] = useState<string[]>([
    "Subsurface utility locating",
    "Topographic elevation contours",
    "Municipal permitting fees",
  ]);
  const [newExclusionInput, setNewExclusionInput] = useState("");

  const [addingType, setAddingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  useEffect(() => {
    if (role === Role.ADMIN) {
      fetchUsers();
      fetchSpokes();
      fetchSurveyTypes();
    }
  }, [role]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

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

  const fetchSurveyTypes = async () => {
    try {
      const res = await fetch("/api/admin/survey-types");
      if (res.ok) {
        const data = await res.json();
        setSurveyTypes(data);
      }
    } catch (err) {
      console.error("Failed to load survey types:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (!newUserName.trim() || !newUserEmail.trim()) {
      setUserError("Name and Email are required.");
      return;
    }

    try {
      setAddingUser(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          spokeId: newUserSpokeId || null,
          address: newUserAddress.trim() || null,
          latitude: newUserLatitude,
          longitude: newUserLongitude,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      setNewUserName("");
      setNewUserEmail("");
      setNewUserSpokeId("");
      setNewUserAddress("");
      setNewUserLatitude(null);
      setNewUserLongitude(null);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || "Failed to add user.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleCreateSpoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpokeError(null);

    if (!newSpokeName.trim() || !newSpokeShort.trim()) {
      setSpokeError("Branch Name and Short Code are required.");
      return;
    }

    try {
      setAddingSpoke(true);
      const res = await fetch("/api/admin/spokes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpokeName.trim(),
          shortName: newSpokeShort.trim().toUpperCase(),
          lbNumber: newSpokeLb.trim() || null,
          dailyCapacity: parseInt(newSpokeCapacity, 10) || 15,
          city: newSpokeCity.trim() || null,
          state: newSpokeState.trim().toUpperCase() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create spoke branch.");
      }

      setNewSpokeName("");
      setNewSpokeShort("");
      setNewSpokeLb("");
      setNewSpokeCity("");
      setNewSpokeState("");
      fetchSpokes();
    } catch (err: any) {
      setSpokeError(err.message || "Failed to add spoke.");
    } finally {
      setAddingSpoke(false);
    }
  };

  const handleAddInclusion = () => {
    if (newInclusionInput.trim()) {
      setInclusions([...inclusions, newInclusionInput.trim()]);
      setNewInclusionInput("");
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions(inclusions.filter((_, i) => i !== index));
  };

  const handleAddExclusion = () => {
    if (newExclusionInput.trim()) {
      setExclusions([...exclusions, newExclusionInput.trim()]);
      setNewExclusionInput("");
    }
  };

  const handleRemoveExclusion = (index: number) => {
    setExclusions(exclusions.filter((_, i) => i !== index));
  };

  const handleCreateSurveyType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError(null);

    if (!newTypeName.trim()) {
      setTypeError("Survey type name is required.");
      return;
    }

    try {
      setAddingType(true);
      const res = await fetch("/api/admin/survey-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeName.trim(),
          defaultPrice: parseFloat(newTypePrice) || 0.0,
          includedFeatures: inclusions,
          excludedFeatures: exclusions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create survey type");
      }

      setNewTypeName("");
      setNewTypePrice("");
      fetchSurveyTypes();
    } catch (err: any) {
      setTypeError(err.message || "Failed to add survey type.");
    } finally {
      setAddingType(false);
    }
  };

  // Access Denied Screen if role != ADMIN
  if (role !== Role.ADMIN) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The Admin Settings panel is restricted to the <span className="font-semibold text-slate-900 dark:text-slate-100">ADMIN</span> role. Your active simulated role is <span className="font-semibold text-slate-900 dark:text-slate-100">{role.replace("_", " ")}</span>.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          To test or manage system settings, switch your active role to <strong>ADMIN</strong> using the selector in the top navigation bar.
        </p>
      </div>
    );
  }

  const getRoleBadge = (userRole: Role) => {
    switch (userRole) {
      case Role.ADMIN:
        return "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case Role.CSR:
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case Role.FIELD_WORKER:
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case Role.DRAFTER:
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case Role.SIGNING_SURVEYOR:
        return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>System Administration & Branch Management</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure regional branches (spokes), surveyor staff roles, baseline pricing, and proposal templates.
          </p>
        </div>

        <Link
          href="/admin/data"
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Data & Accounting Hub
        </Link>
      </div>

      {/* SECTION 1: REGIONAL SPOKES / BRANCHES */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Regional Spokes & Branch Offices ({spokes.length})
          </h2>
        </div>

        {spokeError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{spokeError}</span>
          </div>
        )}

        {/* Add Spoke Form */}
        <form onSubmit={handleCreateSpoke} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Register New Regional Branch (Spoke)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Branch Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Florida Regional Office"
                value={newSpokeName}
                onChange={(e) => setNewSpokeName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Short Code</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="e.g. FL"
                value={newSpokeShort}
                onChange={(e) => setNewSpokeShort(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">LB # (Survey License)</label>
              <input
                type="text"
                placeholder="LB-FL-00128"
                value={newSpokeLb}
                onChange={(e) => setNewSpokeLb(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">City</label>
              <input
                type="text"
                placeholder="Orlando"
                value={newSpokeCity}
                onChange={(e) => setNewSpokeCity(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Daily Cap</label>
              <input
                type="number"
                min="1"
                placeholder="15"
                value={newSpokeCapacity}
                onChange={(e) => setNewSpokeCapacity(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={addingSpoke}
              className="inline-flex items-center px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {addingSpoke ? "Registering..." : "Add Branch"}
            </button>
          </div>
        </form>

        {/* Spokes Table */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
          {spokes.map((s) => (
            <div key={s.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  {s.shortName}
                </span>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {s.city ? `${s.city}, ${s.state || ""}` : "Regional Hub"} {s.lbNumber && `• License: ${s.lbNumber}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{s.dailyCapacity}</span> jobs/day capacity
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {s._count?.users || 0} staff • {s._count?.quotes || 0} quotes • {s._count?.orders || 0} orders
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECTION 2: STAFF MANAGER */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Staff Manager</h2>
            </div>

            {userError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            {/* Add User Form */}
            <form onSubmit={handleCreateUser} className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Add New Staff Member</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="jane@mjslandsurvey.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {Object.values(Role).map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Home Branch (Spoke)</label>
                  <select
                    value={newUserSpokeId}
                    onChange={(e) => setNewUserSpokeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Main Headquarters --</option>
                    {spokes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Home Base / Field Worker Location via Google Autocomplete */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Home Base Location / Dispatch Address {newUserRole === Role.FIELD_WORKER && <span className="text-blue-500 font-bold">(Recommended for Field Dispatch)</span>}
                </label>
                <div className="relative">
                  <ReactGoogleAutocomplete
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyPlaceholderKeyForGooglePlaces"}
                    onPlaceSelected={(place: any) => {
                      if (!place) return;
                      const addr = place.formatted_address || place.name || "";
                      setNewUserAddress(addr);
                      if (place.geometry && place.geometry.location) {
                        setNewUserLatitude(place.geometry.location.lat());
                        setNewUserLongitude(place.geometry.location.lng());
                      }
                    }}
                    options={{
                      types: ["geocode", "establishment"],
                      componentRestrictions: { country: "us" },
                    }}
                    placeholder="Enter worker's base address (e.g. Lindenhurst, NY)..."
                    defaultValue={newUserAddress}
                    onChange={(e: any) => setNewUserAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {newUserLatitude !== null && newUserLongitude !== null && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center">
                    <Navigation className="w-3 h-3 mr-1" />
                    Geocoded Coordinates: {newUserLatitude.toFixed(4)}, {newUserLongitude.toFixed(4)}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={addingUser}
                  className="inline-flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {addingUser ? "Adding..." : "Add Staff Member"}
                </button>
              </div>
            </form>

            {/* Staff List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Current Staff ({users.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {users.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 dark:text-slate-400 italic text-center">No staff members created yet.</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{u.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</div>
                        {u.address && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center mt-0.5">
                            <MapPin className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                            <span>{u.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(u.role)}`}>
                          {u.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SURVEY TYPES & TEMPLATES */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Survey Types & Scope Templates</h2>
            </div>

            {typeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{typeError}</span>
              </div>
            )}

            {/* Add Survey Type Form with Scope Templates */}
            <form onSubmit={handleCreateSurveyType} className="space-y-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Add New Survey Type Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Service / Type Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boundary Survey, Topo, ALTA"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Default Baseline Price ($)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="650.00"
                      value={newTypePrice}
                      onChange={(e) => setNewTypePrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Standard Inclusions Builder */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Standard Inclusions (Deliverables)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an included deliverable (e.g. Set corner pins)..."
                    value={newInclusionInput}
                    onChange={(e) => setNewInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInclusion();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddInclusion}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {inclusions.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInclusion(idx)}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Exclusions Builder */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                  Standard Exclusions (Out of Scope)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an exclusion (e.g. Utility locating)..."
                    value={newExclusionInput}
                    onChange={(e) => setNewExclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExclusion();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {exclusions.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800">
                      <span>✗ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(idx)}
                        className="text-rose-700 dark:text-rose-400 hover:text-rose-900"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={addingType}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {addingType ? "Saving Template..." : "Save Survey Template"}
                </button>
              </div>
            </form>

            {/* Survey Types List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Configured Survey Templates ({surveyTypes.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {surveyTypes.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 dark:text-slate-400 italic text-center">No survey types defined yet.</p>
                ) : (
                  surveyTypes.map((st) => (
                    <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{st.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {st._count?.quotes || 0} quotes • {st._count?.orders || 0} orders
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        ${Number(st.defaultPrice).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
