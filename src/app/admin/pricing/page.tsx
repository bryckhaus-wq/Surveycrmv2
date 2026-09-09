"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Layers,
  MapPin,
  Tag,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

interface PricingBandItem {
  id: string;
  zoneId: string;
  maxAcres: number;
  price: number;
}

interface PricingZoneItem {
  id: string;
  name: string;
  state: string;
  description: string | null;
  quoteOnly: boolean;
  outOfArea: boolean;
  basePrice: number | null;
  bands: PricingBandItem[];
}

interface PricingAddonItem {
  id: string;
  state: string;
  key: string;
  label: string;
  price: number;
  isPerUnit: boolean;
}

export default function AdminPricingPage() {
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [zones, setZones] = useState<PricingZoneItem[]>([]);
  const [addons, setAddons] = useState<PricingAddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Zone Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<PricingZoneItem | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneState, setZoneState] = useState("NY");
  const [zoneDesc, setZoneDesc] = useState("");
  const [zoneQuoteOnly, setZoneQuoteOnly] = useState(false);
  const [zoneOutOfArea, setZoneOutOfArea] = useState(false);
  const [zoneBasePrice, setZoneBasePrice] = useState("");
  const [zoneBands, setZoneBands] = useState<Array<{ maxAcres: number | string; price: number | string }>>([]);
  const [savingZone, setSavingZone] = useState(false);

  // Addon Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<PricingAddonItem | null>(null);
  const [addonState, setAddonState] = useState("NY");
  const [addonKey, setAddonKey] = useState("");
  const [addonLabel, setAddonLabel] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonIsPerUnit, setAddonIsPerUnit] = useState(false);
  const [savingAddon, setSavingAddon] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, [selectedState]);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const stateParam = selectedState === "ALL" ? "" : `?state=${selectedState}`;
      const [zonesRes, addonsRes] = await Promise.all([
        fetch(`/api/admin/pricing/zones${stateParam}`),
        fetch(`/api/admin/pricing/addons${stateParam}`),
      ]);

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData);
      }
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json();
        setAddons(addonsData);
      }
    } catch (err: any) {
      console.error("Failed to load pricing data:", err);
      setStatusMessage({ text: err.message || "Failed to load pricing data", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedPricing = async () => {
    try {
      setSeeding(true);
      setStatusMessage(null);
      const res = await fetch("/api/admin/pricing/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed pricing tables");
      setStatusMessage({ text: "Pricing book catalogs seeded successfully!" });
      await fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to seed pricing", isError: true });
    } finally {
      setSeeding(false);
    }
  };

  // Open Zone Form
  const handleOpenZoneModal = (zone?: PricingZoneItem) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneState(zone.state);
      setZoneDesc(zone.description || "");
      setZoneQuoteOnly(zone.quoteOnly);
      setZoneOutOfArea(zone.outOfArea);
      setZoneBasePrice(zone.basePrice !== null ? String(zone.basePrice) : "");
      setZoneBands(
        zone.bands.map((b) => ({ maxAcres: b.maxAcres, price: b.price }))
      );
    } else {
      setEditingZone(null);
      setZoneName("");
      setZoneState(selectedState === "ALL" ? "NY" : selectedState);
      setZoneDesc("");
      setZoneQuoteOnly(false);
      setZoneOutOfArea(false);
      setZoneBasePrice("");
      setZoneBands([{ maxAcres: 1.0, price: 750 }]);
    }
    setIsZoneModalOpen(true);
  };

  // Save Zone
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingZone(true);
      const payload = {
        name: zoneName,
        state: zoneState,
        description: zoneDesc,
        quoteOnly: zoneQuoteOnly,
        outOfArea: zoneOutOfArea,
        basePrice: zoneBasePrice ? parseFloat(zoneBasePrice) : null,
        bands: zoneBands.map((b) => ({
          maxAcres: parseFloat(String(b.maxAcres)),
          price: parseFloat(String(b.price)),
        })),
      };

      const url = editingZone
        ? `/api/admin/pricing/zones/${editingZone.id}`
        : `/api/admin/pricing/zones`;
      const method = editingZone ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save zone");
      }

      setIsZoneModalOpen(false);
      setStatusMessage({ text: `Zone ${zoneName} saved successfully.` });
      fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    } finally {
      setSavingZone(false);
    }
  };

  // Delete Zone
  const handleDeleteZone = async (zone: PricingZoneItem) => {
    if (!confirm(`Are you sure you want to delete ${zone.name} (${zone.state})?`)) return;
    try {
      const res = await fetch(`/api/admin/pricing/zones/${zone.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete zone");
      setStatusMessage({ text: `Zone ${zone.name} deleted.` });
      fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  // Open Addon Form
  const handleOpenAddonModal = (addon?: PricingAddonItem) => {
    if (addon) {
      setEditingAddon(addon);
      setAddonState(addon.state);
      setAddonKey(addon.key);
      setAddonLabel(addon.label);
      setAddonPrice(String(addon.price));
      setAddonIsPerUnit(addon.isPerUnit);
    } else {
      setEditingAddon(null);
      setAddonState(selectedState === "ALL" ? "NY" : selectedState);
      setAddonKey("");
      setAddonLabel("");
      setAddonPrice("");
      setAddonIsPerUnit(false);
    }
    setIsAddonModalOpen(true);
  };

  // Save Addon
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAddon(true);
      const payload = {
        state: addonState,
        key: addonKey,
        label: addonLabel,
        price: parseFloat(addonPrice),
        isPerUnit: addonIsPerUnit,
      };

      const url = editingAddon
        ? `/api/admin/pricing/addons/${editingAddon.id}`
        : `/api/admin/pricing/addons`;
      const method = editingAddon ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save addon");
      }

      setIsAddonModalOpen(false);
      setStatusMessage({ text: `Add-on ${addonLabel} saved.` });
      fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    } finally {
      setSavingAddon(false);
    }
  };

  // Delete Addon
  const handleDeleteAddon = async (addon: PricingAddonItem) => {
    if (!confirm(`Are you sure you want to delete add-on "${addon.label}"?`)) return;
    try {
      const res = await fetch(`/api/admin/pricing/addons/${addon.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete add-on");
      setStatusMessage({ text: `Add-on ${addon.label} deleted.` });
      fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Admin Portal
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-400" />
              Dynamic Pricing Engine & Zone Matrix
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage regional survey acreage pricing bands, service zone boundaries, and standardized fee add-ons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSeedPricing}
              disabled={seeding}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition"
              title="Populate default regional BOOK zone rules and add-ons"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Seeding Matrix...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Seed Initial Book Matrix
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleOpenZoneModal()}
              className="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Pricing Zone
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddonModal()}
              className="inline-flex items-center px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Fee Add-on
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              statusMessage.isError
                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* State Filter Tabs */}
        <div className="flex items-center space-x-2">
          {["ALL", "NY", "NC"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedState(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedState === st
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st === "ALL" ? "All Territories" : st === "NY" ? "New York (NY)" : "North Carolina (NC)"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Zones & Acreage Bands */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-blue-600" />
                  Regional Pricing Zones ({zones.length})
                </h2>
              </div>

              {zones.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center space-y-2">
                  <p className="text-xs text-slate-500">No pricing zones configured yet.</p>
                  <button
                    onClick={handleSeedPricing}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Click to seed initial pricing zones from the BOOK catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {zone.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                              {zone.state}
                            </span>
                            {zone.quoteOnly && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Quote Only
                              </span>
                            )}
                            {zone.outOfArea && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                Out of Area (Declined)
                              </span>
                            )}
                          </div>
                          {zone.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {zone.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenZoneModal(zone)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition"
                            title="Edit Zone & Bands"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Acreage Bands Table */}
                      {zone.bands.length > 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700/60">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                            Acreage Cutoff Bands
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {zone.bands.map((b, idx) => (
                              <div
                                key={b.id || idx}
                                className="bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                              >
                                <span className="font-mono text-slate-600 dark:text-slate-400">
                                  &le; {b.maxAcres} ac
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ${b.price.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs italic text-slate-400">
                          {zone.quoteOnly
                            ? `Quote only (Starting floor: $${zone.basePrice || 1200})`
                            : zone.outOfArea
                            ? "Strictly outside operating radius — automatically declined."
                            : "No acreage bands defined."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Standard Add-ons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-indigo-600" />
                  Fee Add-ons ({addons.length})
                </h2>
              </div>

              {addons.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No add-ons configured.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
                  {addons.map((addon) => (
                    <div key={addon.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {addon.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {addon.state}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Key: {addon.key} {addon.isPerUnit ? "(per unit)" : "(flat)"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ${addon.price.toLocaleString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenAddonModal(addon)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(addon)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit/Create Zone Modal */}
        {isZoneModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingZone ? `Edit Zone: ${editingZone.name}` : "Create New Pricing Zone"}
                </h3>
                <button
                  onClick={() => setIsZoneModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveZone} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Zone Name
                    </label>
                    <input
                      type="text"
                      required
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      placeholder="e.g. Zone A"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      State
                    </label>
                    <select
                      value={zoneState}
                      onChange={(e) => setZoneState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    >
                      <option value="NY">New York (NY)</option>
                      <option value="NC">North Carolina (NC)</option>
                      <option value="FL">Florida (FL)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={zoneDesc}
                    onChange={(e) => setZoneDesc(e.target.value)}
                    placeholder="e.g. Nassau County, inland territories"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zoneQuoteOnly}
                      onChange={(e) => setZoneQuoteOnly(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Quote Only (Requires PM Review)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zoneOutOfArea}
                      onChange={(e) => setZoneOutOfArea(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Out of Area (Decline)
                    </span>
                  </label>
                </div>

                {/* Acreage Bands Editor */}
                {!zoneOutOfArea && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Acreage Bands
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoneBands([...zoneBands, { maxAcres: 1.0, price: 500 }])}
                        className="text-blue-600 hover:underline flex items-center text-[11px] font-semibold"
                      >
                        <Plus className="w-3 h-3 mr-0.5" /> Add Band
                      </button>
                    </div>

                    <div className="space-y-2">
                      {zoneBands.map((band, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              step="any"
                              required
                              value={band.maxAcres}
                              onChange={(e) => {
                                const copy = [...zoneBands];
                                copy[idx].maxAcres = e.target.value;
                                setZoneBands(copy);
                              }}
                              placeholder="Max Acres (e.g. 0.8)"
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              step="any"
                              required
                              value={band.price}
                              onChange={(e) => {
                                const copy = [...zoneBands];
                                copy[idx].price = e.target.value;
                                setZoneBands(copy);
                              }}
                              placeholder="Price ($)"
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setZoneBands(zoneBands.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsZoneModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingZone}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50 flex items-center"
                  >
                    {savingZone ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Save Zone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit/Create Addon Modal */}
        {isAddonModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingAddon ? `Edit Add-on: ${editingAddon.label}` : "Create New Fee Add-on"}
                </h3>
                <button
                  onClick={() => setIsAddonModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAddon} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <select
                    value={addonState}
                    onChange={(e) => setAddonState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  >
                    <option value="NY">New York (NY)</option>
                    <option value="NC">North Carolina (NC)</option>
                    <option value="FL">Florida (FL)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Key
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingAddon)}
                    value={addonKey}
                    onChange={(e) => setAddonKey(e.target.value)}
                    placeholder="e.g. extra_stake_ny"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Label
                  </label>
                  <input
                    type="text"
                    required
                    value={addonLabel}
                    onChange={(e) => setAddonLabel(e.target.value)}
                    placeholder="e.g. Extra Corner Stake (over 4)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={addonPrice}
                      onChange={(e) => setAddonPrice(e.target.value)}
                      placeholder="e.g. 125"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addonIsPerUnit}
                        onChange={(e) => setAddonIsPerUnit(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Is Per-Unit Rate
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddonModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddon}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50 flex items-center"
                  >
                    {savingAddon ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Save Add-on
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
