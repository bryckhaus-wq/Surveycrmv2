"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  MousePointer,
  Compass,
  Map as MapIcon,
  Crosshair,
  Maximize2,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";

interface PricingBandItem {
  id?: string;
  zoneId?: string;
  maxAcres: number | string;
  price: number | string;
}

interface PricingZoneItem {
  id: string;
  name: string;
  state: string;
  description: string | null;
  color?: string | null;
  priority?: number;
  quoteOnly: boolean;
  outOfArea: boolean;
  basePrice: number | null;
  geometry?: any;
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

// Preset Regional Map Viewports
const REGIONAL_VIEWPORTS: Record<string, { lat: number; lon: number; zoom: number; name: string }> = {
  NY: { lat: 40.85, lon: -73.2, zoom: 9, name: "New York (Long Island / NYC / Upstate)" },
  NC: { lat: 35.75, lon: -78.6, zoom: 8, name: "North Carolina (Raleigh / Clayton)" },
  FL: { lat: 28.53, lon: -81.37, zoom: 8, name: "Florida (Orlando Metro)" },
};

const COLOR_SWATCHES = [
  { name: "Emerald", hex: "#10b981" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Orange", hex: "#f97316" },
  { name: "Rose", hex: "#ef4444" },
  { name: "Slate", hex: "#64748b" },
];

export default function AdminPricingPage() {
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"MAP" | "TABLE">("MAP");
  const [zones, setZones] = useState<PricingZoneItem[]>([]);
  const [addons, setAddons] = useState<PricingAddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Map View State
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number }>({ lat: 40.85, lon: -73.2 });
  const [zoomLevel, setZoomLevel] = useState<number>(9);
  const [mapType, setMapType] = useState<"SATELLITE" | "STREET">("SATELLITE");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draftNodes, setDraftNodes] = useState<Array<[number, number]>>([]); // [lon, lat]
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZoneOnMap, setSelectedZoneOnMap] = useState<PricingZoneItem | null>(null);

  // Zone Modal & Drawer State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<PricingZoneItem | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneState, setZoneState] = useState("NY");
  const [zoneDesc, setZoneDesc] = useState("");
  const [zoneColor, setZoneColor] = useState("#3b82f6");
  const [zonePriority, setZonePriority] = useState("20");
  const [zoneQuoteOnly, setZoneQuoteOnly] = useState(false);
  const [zoneOutOfArea, setZoneOutOfArea] = useState(false);
  const [zoneBasePrice, setZoneBasePrice] = useState("");
  const [zoneBands, setZoneBands] = useState<PricingBandItem[]>([]);
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

  const mapSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    fetchPricingData();
  }, [selectedState]);

  // Adjust map center when filter changes
  useEffect(() => {
    if (selectedState !== "ALL" && REGIONAL_VIEWPORTS[selectedState]) {
      setMapCenter({
        lat: REGIONAL_VIEWPORTS[selectedState].lat,
        lon: REGIONAL_VIEWPORTS[selectedState].lon,
      });
      setZoomLevel(REGIONAL_VIEWPORTS[selectedState].zoom);
    }
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
      setStatusMessage({ text: "Pricing book catalogs and map polygons seeded successfully!" });
      await fetchPricingData();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to seed pricing", isError: true });
    } finally {
      setSeeding(false);
    }
  };

  // Convert Lon/Lat coordinate to SVG Pixel coordinate in Map Canvas
  const coordToPixel = (lon: number, lat: number, width: number, height: number) => {
    // Mercator approximation scaled to zoom
    const latRad = (lat * Math.PI) / 180;
    const centerLatRad = (mapCenter.lat * Math.PI) / 180;

    const scale = Math.pow(2, zoomLevel) * 120;
    const x = width / 2 + (lon - mapCenter.lon) * (scale / 360) * Math.cos(centerLatRad);
    const y = height / 2 - (lat - mapCenter.lat) * (scale / 360);

    return { x, y };
  };

  // Convert SVG Pixel coordinate back to Lon/Lat coordinate
  const pixelToCoord = (x: number, y: number, width: number, height: number) => {
    const centerLatRad = (mapCenter.lat * Math.PI) / 180;
    const scale = Math.pow(2, zoomLevel) * 120;

    const lon = mapCenter.lon + ((x - width / 2) / (scale / 360)) / Math.cos(centerLatRad);
    const lat = mapCenter.lat - ((y - height / 2) / (scale / 360));

    return { lon: Math.round(lon * 100000) / 100000, lat: Math.round(lat * 100000) / 100000 };
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const svg = mapSvgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const coord = pixelToCoord(x, y, rect.width, rect.height);
    setDraftNodes((prev) => [...prev, [coord.lon, coord.lat]]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = mapSvgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coord = pixelToCoord(x, y, rect.width, rect.height);
    setCursorCoord(coord);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDraftNodes([]);
    setStatusMessage({
      text: "Click on the map to place boundary points. Click 'Complete & Save Zone' when finished.",
    });
  };

  const handleCompleteDrawing = () => {
    if (draftNodes.length < 3) {
      alert("A polygon requires at least 3 points. Please click on the map to add more points.");
      return;
    }

    // Auto close polygon
    const closedCoords = [...draftNodes, draftNodes[0]];
    const newGeometry = {
      type: "Polygon",
      coordinates: [closedCoords],
    };

    setIsDrawing(false);
    setDraftNodes([]);

    // Open zone creation form pre-filled with drawn geometry
    setEditingZone(null);
    setZoneName(`New Zone ${zones.length + 1}`);
    setZoneState(selectedState === "ALL" ? "NY" : selectedState);
    setZoneDesc("Custom drawn geographic service polygon");
    setZoneColor(COLOR_SWATCHES[zones.length % COLOR_SWATCHES.length].hex);
    setZonePriority("25");
    setZoneQuoteOnly(false);
    setZoneOutOfArea(false);
    setZoneBasePrice("");
    setZoneBands([
      { maxAcres: 1.0, price: 750 },
      { maxAcres: 2.0, price: 1100 },
      { maxAcres: 3.0, price: 1600 },
    ]);
    (window as any).__tempDrawnGeometry = newGeometry;
    setIsZoneModalOpen(true);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDraftNodes([]);
    setStatusMessage(null);
  };

  // Open Zone Form
  const handleOpenZoneModal = (zone?: PricingZoneItem) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneState(zone.state);
      setZoneDesc(zone.description || "");
      setZoneColor(zone.color || "#3b82f6");
      setZonePriority(String(zone.priority ?? 20));
      setZoneQuoteOnly(zone.quoteOnly);
      setZoneOutOfArea(zone.outOfArea);
      setZoneBasePrice(zone.basePrice !== null ? String(zone.basePrice) : "");
      setZoneBands(
        zone.bands.map((b) => ({ maxAcres: b.maxAcres, price: b.price }))
      );
      (window as any).__tempDrawnGeometry = zone.geometry;
    } else {
      setEditingZone(null);
      setZoneName("");
      setZoneState(selectedState === "ALL" ? "NY" : selectedState);
      setZoneDesc("");
      setZoneColor("#3b82f6");
      setZonePriority("20");
      setZoneQuoteOnly(false);
      setZoneOutOfArea(false);
      setZoneBasePrice("");
      setZoneBands([{ maxAcres: 1.0, price: 750 }]);
      (window as any).__tempDrawnGeometry = null;
    }
    setIsZoneModalOpen(true);
  };

  // Save Zone
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingZone(true);
      const geometry = (window as any).__tempDrawnGeometry || editingZone?.geometry || null;

      const payload = {
        name: zoneName,
        state: zoneState,
        description: zoneDesc,
        color: zoneColor,
        priority: parseInt(zonePriority, 10) || 0,
        quoteOnly: zoneQuoteOnly,
        outOfArea: zoneOutOfArea,
        basePrice: zoneBasePrice ? parseFloat(zoneBasePrice) : null,
        geometry,
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
      setSelectedZoneOnMap(null);
      setStatusMessage({ text: `Zone ${zoneName} saved successfully with map geometry.` });
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
      setSelectedZoneOnMap(null);
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

  // Render GeoJSON Polygons in SVG
  const renderPolygons = useMemo(() => {
    const width = 1000;
    const height = 650;

    return zones.map((zone) => {
      if (!zone.geometry) return null;
      let rings: number[][][] = [];

      if (zone.geometry.type === "Polygon" && Array.isArray(zone.geometry.coordinates)) {
        rings = zone.geometry.coordinates;
      } else if (zone.geometry.type === "MultiPolygon" && Array.isArray(zone.geometry.coordinates)) {
        rings = zone.geometry.coordinates.flat();
      }

      const isSelected = selectedZoneOnMap?.id === zone.id;
      const isHovered = hoveredZoneId === zone.id;
      const color = zone.color || "#3b82f6";

      return rings.map((ring, ringIdx) => {
        if (!ring || ring.length < 3) return null;
        const pointsStr = ring
          .map((pt) => {
            const { x, y } = coordToPixel(pt[0], pt[1], width, height);
            return `${x},${y}`;
          })
          .join(" ");

        return (
          <g key={`${zone.id}-${ringIdx}`}>
            <polygon
              points={pointsStr}
              fill={color}
              fillOpacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.22}
              stroke={color}
              strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
              strokeDasharray={zone.quoteOnly ? "4,3" : undefined}
              className="cursor-pointer transition-all duration-200 hover:brightness-110"
              onMouseEnter={() => setHoveredZoneId(zone.id)}
              onMouseLeave={() => setHoveredZoneId(null)}
              onClick={() => setSelectedZoneOnMap(zone)}
            />
          </g>
        );
      });
    });
  }, [zones, mapCenter, zoomLevel, hoveredZoneId, selectedZoneOnMap]);

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
              Dynamic Pricing Engine & Map Zone Matrix
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Draw interactive geographic service polygons on the live map, configure acreage tiers, and manage fee add-ons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 mr-2">
              <button
                type="button"
                onClick={() => setActiveTab("MAP")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center ${
                  activeTab === "MAP"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 mr-1" />
                Interactive Map Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("TABLE")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center ${
                  activeTab === "TABLE"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5 mr-1" />
                Pricing Table & Add-ons
              </button>
            </div>

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

        {/* State Filter Tabs & Viewport Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {["ALL", "NY", "NC", "FL"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedState === st
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {st === "ALL" ? "All Territories" : st === "NY" ? "New York (NY)" : st === "NC" ? "North Carolina (NC)" : "Florida (FL)"}
              </button>
            ))}
          </div>

          {activeTab === "MAP" && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Map Focus:</span>
              <button
                type="button"
                onClick={() => {
                  setMapCenter({ lat: 40.85, lon: -73.2 });
                  setZoomLevel(9);
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Long Island / NY
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapCenter({ lat: 35.75, lon: -78.6 });
                  setZoomLevel(8);
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Raleigh / Clayton (NC)
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: INTERACTIVE MAP DRAWING WORKSPACE */}
        {activeTab === "MAP" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Map Canvas - 3 Columns */}
            <div className="lg:col-span-3 space-y-3">
              {/* Map Toolbar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  {!isDrawing ? (
                    <button
                      type="button"
                      onClick={handleStartDrawing}
                      className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Draw New Polygon Zone
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleCompleteDrawing}
                        className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow animate-pulse"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Complete & Save Zone ({draftNodes.length} pts)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftNodes(draftNodes.slice(0, -1))}
                        disabled={draftNodes.length === 0}
                        className="inline-flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Undo Node
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDrawing}
                        className="inline-flex items-center px-3 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Layer Tile Mode */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setMapType("SATELLITE")}
                      className={`px-2 py-1 rounded ${
                        mapType === "SATELLITE" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Satellite
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapType("STREET")}
                      className={`px-2 py-1 rounded ${
                        mapType === "STREET" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Streets
                    </button>
                  </div>
                </div>

                {/* Coordinates Tracker */}
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {cursorCoord && (
                    <span>
                      Lat: {cursorCoord.lat.toFixed(4)}, Lon: {cursorCoord.lon.toFixed(4)}
                    </span>
                  )}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(13, z + 1))}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(5, z - 1))}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold"
                      title="Zoom Out"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Canvas Frame */}
              <div
                className={`relative w-full h-[650px] bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner select-none ${
                  isDrawing ? "cursor-crosshair" : "cursor-grab"
                }`}
              >
                {/* Background Map Imagery / Tile Emulation */}
                <div
                  className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                  style={{
                    backgroundImage:
                      mapType === "SATELLITE"
                        ? `url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${mapCenter.lon - 1.5},${mapCenter.lat - 1.0},${mapCenter.lon + 1.5},${mapCenter.lat + 1.0}&bboxSR=4326&size=1000,650&format=png&f=image')`
                        : undefined,
                    backgroundColor: mapType === "STREET" ? "#1e293b" : "#0f172a",
                  }}
                />

                {/* SVG Layer for Polygons & Drawing */}
                <svg
                  ref={mapSvgRef}
                  viewBox="0 0 1000 650"
                  className="absolute inset-0 w-full h-full"
                  onClick={handleMapClick}
                  onMouseMove={handleMouseMove}
                >
                  {/* Render Saved Zone Polygons */}
                  {renderPolygons}

                  {/* Render Current Draft Polygon Nodes */}
                  {isDrawing && draftNodes.length > 0 && (
                    <g>
                      {/* Connecting line between nodes */}
                      <polyline
                        points={draftNodes
                          .map((pt) => {
                            const { x, y } = coordToPixel(pt[0], pt[1], 1000, 650);
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4,4"
                      />
                      {/* Vertex circles */}
                      {draftNodes.map((pt, idx) => {
                        const { x, y } = coordToPixel(pt[0], pt[1], 1000, 650);
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r={idx === 0 ? "6" : "4.5"}
                            fill={idx === 0 ? "#10b981" : "#ffffff"}
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </g>
                  )}
                </svg>

                {/* Drawing Helper Overlay */}
                {isDrawing && (
                  <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-lg border border-emerald-500/80 shadow-lg text-xs space-y-1 max-w-xs pointer-events-none">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                      <Crosshair className="w-4 h-4 animate-spin" />
                      <span>Drawing Polygon Mode Active</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Click anywhere on the map to place boundary pins ({draftNodes.length} nodes added).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar: Selected / Highlighted Zone Details */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center">
                    <Compass className="w-4 h-4 mr-1.5 text-blue-600" />
                    Zone Inspector
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleOpenZoneModal()}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + New Zone
                  </button>
                </div>

                {selectedZoneOnMap ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                          {selectedZoneOnMap.name}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {selectedZoneOnMap.state}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 inline-block"
                            style={{ backgroundColor: selectedZoneOnMap.color || "#3b82f6" }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenZoneModal(selectedZoneOnMap)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit Zone"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(selectedZoneOnMap)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {selectedZoneOnMap.description && (
                      <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        {selectedZoneOnMap.description}
                      </p>
                    )}

                    {/* Acreage Bands */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                        Acreage Bands
                      </span>
                      {selectedZoneOnMap.bands.length > 0 ? (
                        <div className="space-y-1">
                          {selectedZoneOnMap.bands.map((b, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded"
                            >
                              <span className="font-mono text-slate-600 dark:text-slate-400">
                                &le; {b.maxAcres} acres
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ${Number(b.price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="italic text-slate-400 text-[11px]">
                          {selectedZoneOnMap.quoteOnly
                            ? "Quote Only (Requires PM determination)"
                            : selectedZoneOnMap.outOfArea
                            ? "Out of Territory"
                            : "No tiers configured."}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2 text-slate-400">
                    <MousePointer className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs">Click any polygon on the map to inspect its pricing tiers and boundary geometry.</p>
                  </div>
                )}
              </div>

              {/* All Map Zones Quick List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-2 max-h-72 overflow-y-auto">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                  Active Region Zones ({zones.length})
                </span>
                {zones.map((z) => (
                  <div
                    key={z.id}
                    onClick={() => setSelectedZoneOnMap(z)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                      selectedZoneOnMap?.id === z.id
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-200"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: z.color || "#3b82f6" }}
                      />
                      <span className="truncate">{z.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 ml-2">
                      {z.bands.length} tiers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRICING TABLE & ADDONS VIEW */}
        {activeTab === "TABLE" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Zones & Acreage Bands */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-blue-600" />
                  Regional Pricing Zones ({zones.length})
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenZoneModal()}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Zone
                </button>
              </div>

              <div className="space-y-4">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-black/20"
                            style={{ backgroundColor: zone.color || "#3b82f6" }}
                          />
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
                              Out of Area
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
                                ${Number(b.price).toLocaleString()}
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
                          ? "Strictly outside operating radius."
                          : "No acreage bands defined."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Standard Add-ons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-indigo-600" />
                  Fee Add-ons ({addons.length})
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenAddonModal()}
                  className="inline-flex items-center px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Fee
                </button>
              </div>

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

                {/* Color and Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Map Display Color
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={zoneColor}
                        onChange={(e) => setZoneColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={zoneColor}
                        onChange={(e) => setZoneColor(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Evaluation Priority (1-100)
                    </label>
                    <input
                      type="number"
                      value={zonePriority}
                      onChange={(e) => setZonePriority(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>
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
