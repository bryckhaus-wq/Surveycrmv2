"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactGoogleAutocomplete from "react-google-autocomplete";
import {
  ArrowLeft,
  Save,
  Building2,
  MapPin,
  User,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Receipt,
  Users,
} from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
}

interface SpokeOption {
  id: string;
  name: string;
  shortName: string;
  lbNumber?: string | null;
}

interface SurveyType {
  id: string;
  name: string;
  defaultPrice: string | number;
  includedFeatures?: string[] | null;
  excludedFeatures?: string[] | null;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export default function NewQuotePage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [spokes, setSpokes] = useState<SpokeOption[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<SurveyType[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [spokeId, setSpokeId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [surveyTypeId, setSurveyTypeId] = useState("");
  const [assignedCsrId, setAssignedCsrId] = useState("");
  const [price, setPrice] = useState("");

  // Scope & Deliverables State
  const [customScope, setCustomScope] = useState("");
  const [includedFeatures, setIncludedFeatures] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState("");
  const [excludedFeatures, setExcludedFeatures] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState("");

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [clientsRes, spokesRes, stRes, usersRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/admin/spokes"),
        fetch("/api/admin/survey-types"),
        fetch("/api/admin/users"),
      ]);

      if (clientsRes.ok) {
        const cData: ClientOption[] = await clientsRes.json();
        setClients(cData);
        if (cData.length > 0) {
          handleSelectClient(cData[0].id, cData);
        }
      }

      if (spokesRes.ok) {
        const sData: SpokeOption[] = await spokesRes.json();
        setSpokes(sData);
        if (sData.length > 0) {
          setSpokeId(sData[0].id);
        }
      }

      if (stRes.ok) {
        const stData: SurveyType[] = await stRes.json();
        setSurveyTypes(stData);
        if (stData.length > 0) {
          applySurveyTypeDefaults(stData[0]);
        }
      }

      if (usersRes.ok) {
        const uData: StaffUser[] = await usersRes.json();
        setUsers(uData);
        const firstCsr = uData.find((u) => u.role === "CSR" || u.role === "ADMIN");
        if (firstCsr) {
          setAssignedCsrId(firstCsr.id);
        }
      }
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  };

  const handleSelectClient = (id: string, list = clients) => {
    setClientId(id);
    const found = list.find((c) => c.id === id);
    if (found) {
      setSelectedClient(found);
      setClientName(found.name);
      setClientEmail(found.email || "");
      setClientPhone(found.phone || "");
    } else {
      setSelectedClient(null);
    }
  };

  const applySurveyTypeDefaults = (st: SurveyType) => {
    setSurveyTypeId(st.id);
    setPrice(Number(st.defaultPrice).toString());
    const inc = Array.isArray(st.includedFeatures) ? [...st.includedFeatures] : [];
    const exc = Array.isArray(st.excludedFeatures) ? [...st.excludedFeatures] : [];
    setIncludedFeatures(inc);
    setExcludedFeatures(exc);
  };

  const handleSurveyTypeChange = (selectedId: string) => {
    const matched = surveyTypes.find((st) => st.id === selectedId);
    if (matched) {
      applySurveyTypeDefaults(matched);
    }
  };

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setIncludedFeatures([...includedFeatures, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setIncludedFeatures(includedFeatures.filter((_, i) => i !== index));
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExcludedFeatures([...excludedFeatures, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const handleRemoveExclusion = (index: number) => {
    setExcludedFeatures(excludedFeatures.filter((_, i) => i !== index));
  };

  const handlePlaceSelected = (place: any) => {
    if (!place || !place.address_components) return;

    let streetNumber = "";
    let route = "";
    let locality = "";
    let adminArea = "";
    let postalCode = "";

    for (const component of place.address_components) {
      const types = component.types;
      if (types.includes("street_number")) {
        streetNumber = component.long_name;
      }
      if (types.includes("route")) {
        route = component.long_name;
      }
      if (types.includes("locality")) {
        locality = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        adminArea = component.short_name;
      }
      if (types.includes("postal_code")) {
        postalCode = component.long_name;
      }
    }

    const fullStreetAddress = `${streetNumber} ${route}`.trim() || place.formatted_address || place.name || "";
    setAddress(fullStreetAddress);
    if (locality) setCity(locality);
    if (adminArea) setState(adminArea);
    if (postalCode) setZip(postalCode);

    if (place.geometry && place.geometry.location) {
      setLatitude(place.geometry.location.lat());
      setLongitude(place.geometry.location.lng());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || !address.trim() || !city.trim() || !state.trim() || !zip.trim() || !surveyTypeId) {
      setError("Please select a client and fill in all required property address and survey fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          clientName,
          clientEmail,
          clientPhone,
          spokeId: spokeId || null,
          address,
          city,
          state,
          zip,
          latitude,
          longitude,
          surveyTypeId,
          assignedCsrId: assignedCsrId || null,
          price: parseFloat(price) || 0,
          status: "NEW",
          customScope: customScope.trim() || null,
          includedFeatures,
          excludedFeatures,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create quote");
      }

      const created = await res.json();
      router.push(`/quotes/${created.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while creating quote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link & Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/quotes"
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Quotes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Create New Survey Proposal
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* HIGHLIGHTED CLIENT INSTRUCTIONS & INVOICING WARNING BOX */}
      {selectedClient && (selectedClient.specialInstructions || selectedClient.defaultInvoiceRules) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-2">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Standing Account Rules for {selectedClient.name} ({selectedClient.clientType})</span>
            </div>
            <span className="text-[11px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
              Review Before Quoting
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-amber-900 dark:text-amber-200">
            {selectedClient.defaultInvoiceRules && (
              <div className="space-y-1 bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                <span className="font-bold flex items-center text-amber-800 dark:text-amber-300">
                  <Receipt className="w-3.5 h-3.5 mr-1" />
                  Default Invoicing & Billing Protocol
                </span>
                <p className="text-amber-950 dark:text-amber-100">{selectedClient.defaultInvoiceRules}</p>
              </div>
            )}

            {selectedClient.specialInstructions && (
              <div className="space-y-1 bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                <span className="font-bold flex items-center text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Standing Field & Legal Special Instructions
                </span>
                <p className="text-amber-950 dark:text-amber-100">{selectedClient.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Relational Client Selector Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Client & Regional Branch
              </h2>
            </div>
            <Link
              href="/clients/new"
              target="_blank"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              + Add New Client Account
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Searchable Client Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Client Account <span className="text-rose-500">*</span>
              </label>
              {clients.length > 0 ? (
                <select
                  value={clientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose from Client Directory --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientType}) {c.phone ? `• ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <span>No clients in directory yet.</span>
                  <Link href="/clients/new" className="font-bold underline">Create First Client</Link>
                </div>
              )}
            </div>

            {/* Regional Spoke / Branch Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Regional Spoke (Branch)
              </label>
              <select
                value={spokeId}
                onChange={(e) => setSpokeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Main Headquarters --</option>
                {spokes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled client contact preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Client Name
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Property Location Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Property Location</h2>
          </div>

          {/* Google Places Autocomplete */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Google Address Autocomplete Search
            </label>
            <ReactGoogleAutocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyPlaceholderKeyForGooglePlaces"}
              onPlaceSelected={handlePlaceSelected}
              options={{
                types: ["geocode", "establishment"],
                componentRestrictions: { country: "us" },
              }}
              placeholder="Start typing an address or property name..."
              className="w-full px-3 py-2 bg-blue-50/50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Selecting a location will automatically fill in address fields, latitude, and longitude.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="ST"
                  maxLength={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm uppercase focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Zip <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="12345"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Latitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={latitude ?? ""}
                onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 29.7604"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Longitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={longitude ?? ""}
                onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. -95.3698"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Survey & Pricing Details Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Survey Type & Baseline Pricing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Survey Template <span className="text-rose-500">*</span>
              </label>
              {surveyTypes.length > 0 ? (
                <select
                  value={surveyTypeId}
                  onChange={(e) => handleSurveyTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {surveyTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} (${Number(st.defaultPrice).toFixed(2)})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  No survey types configured.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Assigned CSR
              </label>
              <select
                value={assignedCsrId}
                onChange={(e) => setAssignedCsrId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quoted Price ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom Scope & Terms Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Proposal Scope of Work & Terms Customizer
            </h2>
          </div>

          {/* Custom Scope Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Specific Scope / Field Instructions
            </label>
            <textarea
              rows={3}
              value={customScope}
              onChange={(e) => setCustomScope(e.target.value)}
              placeholder="e.g. Field crew to clear 10ft of brush along southern boundary, recover iron rod pin near oak tree, tie into City benchmark #14..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Inclusions & Exclusions Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Included Deliverables */}
            <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Included Deliverables ({includedFeatures.length})
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom inclusion..."
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInclusion();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddInclusion}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {includedFeatures.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60"
                  >
                    <span>✓ {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInclusion(idx)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Excluded Items */}
            <div className="space-y-3 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center">
                  <XCircle className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400" />
                  Excluded Services ({excludedFeatures.length})
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom exclusion..."
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddExclusion();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={handleAddExclusion}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {excludedFeatures.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60"
                  >
                    <span>✗ {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExclusion(idx)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <Link
            href="/quotes"
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || surveyTypes.length === 0}
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating Quote..." : "Save & Generate Proposal"}
          </button>
        </div>
      </form>
    </div>
  );
}
