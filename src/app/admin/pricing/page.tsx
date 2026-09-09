"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  ZoomIn,
  ZoomOut,
  Move,
  Search,
  Sliders,
  Navigation,
  HelpCircle,
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
const REGIONAL_VIEWPORTS: Record<
  string,
  { lat: number; lon: number; zoom: number; name: string }
> = {
  NY: { lat: 40.85, lon: -73.2, zoom: 10, name: "New York (Long Island / NYC)" },
  NC: { lat: 35.75, lon: -78.6, zoom: 10, name: "North Carolina (Raleigh / Clayton)" },
  FL: { lat: 28.53, lon: -81.37, zoom: 10, name: "Florida (Orlando / Central FL)" },
  LI_EAST: { lat: 40.91, lon: -72.65, zoom: 12, name: "Eastern Long Island (Suffolk)" },
  LI_WEST: { lat: 40.73, lon: -73.6, zoom: 12, name: "Western Long Island (Nassau)" },
  RALEIGH: { lat: 35.7796, lon: -78.6382, zoom: 13, name: "Raleigh Metro" },
  CLAYTON: { lat: 35.6507, lon: -78.4564, zoom: 13, name: "Clayton / Johnston" },
  ORLANDO: { lat: 28.5383, lon: -81.3792, zoom: 13, name: "Orlando Downtown" },
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

/* =========================================================================
   Web Mercator (EPSG:3857) High Precision Projection & Geographic Math
========================================================================= */

function lonLatToWorld(lon: number, lat: number): { x: number; y: number } {
  const x = (lon + 180) / 360;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.999999, Math.min(0.999999, sinLat));
  const y = 0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI);
  return { x, y };
}

function worldToLonLat(x: number, y: number): { lon: number; lat: number } {
  const lon = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lon: Math.round(lon * 1000000) / 1000000,
    lat: Math.round(lat * 1000000) / 1000000,
  };
}

function coordToPixel(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const worldPt = lonLatToWorld(lon, lat);
  const centerWorld = lonLatToWorld(centerLon, centerLat);

  const x = width / 2 + (worldPt.x - centerWorld.x) * scale;
  const y = height / 2 + (worldPt.y - centerWorld.y) * scale;
  return { x, y };
}

function pixelToCoord(
  screenX: number,
  screenY: number,
  centerLon: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number
): { lon: number; lat: number } {
  const scale = 256 * Math.pow(2, zoom);
  const centerWorld = lonLatToWorld(centerLon, centerLat);

  const worldX = centerWorld.x + (screenX - width / 2) / scale;
  const worldY = centerWorld.y + (screenY - height / 2) / scale;
  return worldToLonLat(worldX, worldY);
}

// Geodesic distance in feet between two coords
function getDistanceFeet(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 20902231; // Earth radius in feet
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Approximate polygon area in acres using spherical polygon formula
function getPolygonAreaAcres(coords: Array<[number, number]>): number {
  if (coords.length < 3) return 0;
  const ring =
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords
      : [...coords, coords[0]];
  let total = 0;
  const degToRad = Math.PI / 180;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total +=
      (lon2 - lon1) *
      degToRad *
      (2 + Math.sin(lat1 * degToRad) + Math.sin(lat2 * degToRad));
  }
  const areaSqMeters = Math.abs((total * 6378137 * 6378137) / 2.0);
  const areaAcres = areaSqMeters / 4046.8564224;
  return Math.round(areaAcres * 100) / 100;
}

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
  const [zoomLevel, setZoomLevel] = useState<number>(10);
  const [mapType, setMapType] = useState<"SATELLITE" | "HYBRID" | "STREET" | "TOPO">("HYBRID");
  const [mapMode, setMapMode] = useState<"PAN" | "DRAW">("DRAW");

  // Polygon Drawing & Precision Node Editing
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draftNodes, setDraftNodes] = useState<Array<[number, number]>>([]); // [lon, lat]
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [cursorScreenPos, setCursorScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
  const [draggingNodeIndex, setDraggingNodeIndex] = useState<number | null>(null);
  const [isSnappedToStart, setIsSnappedToStart] = useState<boolean>(false);

  // Hover & Inspector
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZoneOnMap, setSelectedZoneOnMap] = useState<PricingZoneItem | null>(null);

  // Panning State
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; centerWorld: { x: number; y: number } } | null>(null);
  const isSpacePressedRef = useRef<boolean>(false);

  // Address Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);

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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapSvgRef = useRef<SVGSVGElement | null>(null);

  // Map Container Dynamic Size
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 1000, height: 650 });

  useEffect(() => {
    fetchPricingData();
  }, [selectedState]);

  // Track map container size
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [activeTab]);

  // Adjust map center when filter tab changes
  useEffect(() => {
    if (selectedState !== "ALL" && REGIONAL_VIEWPORTS[selectedState]) {
      setMapCenter({
        lat: REGIONAL_VIEWPORTS[selectedState].lat,
        lon: REGIONAL_VIEWPORTS[selectedState].lon,
      });
      setZoomLevel(REGIONAL_VIEWPORTS[selectedState].zoom);
    }
  }, [selectedState]);

  // Keyboard Shortcuts (Space to pan, Enter to complete, Ctrl+Z to undo, Esc to cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressedRef.current && (e.target as HTMLElement)?.tagName !== "INPUT") {
        isSpacePressedRef.current = true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && isDrawing) {
        e.preventDefault();
        setDraftNodes((prev) => prev.slice(0, -1));
      }
      if (e.key === "Enter" && isDrawing && draftNodes.length >= 3) {
        e.preventDefault();
        handleCompleteDrawing();
      }
      if (e.key === "Escape" && isDrawing) {
        e.preventDefault();
        handleCancelDrawing();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDrawing, draftNodes]);

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

  /* =========================================================================
     Mouse Wheel Zoom Centered on Cursor Position
  ========================================================================= */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = mapContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Get current lon/lat under cursor
    const mouseCoord = pixelToCoord(
      mouseX,
      mouseY,
      mapCenter.lon,
      mapCenter.lat,
      zoomLevel,
      canvasSize.width,
      canvasSize.height
    );

    const delta = e.deltaY < 0 ? 0.5 : -0.5;
    const nextZoom = Math.max(4, Math.min(19, zoomLevel + delta));

    if (nextZoom === zoomLevel) return;

    // Compute new center to keep mouseCoord under same mouseX, mouseY
    const scale = 256 * Math.pow(2, nextZoom);
    const targetWorld = lonLatToWorld(mouseCoord.lon, mouseCoord.lat);
    const newCenterWorldX = targetWorld.x - (mouseX - canvasSize.width / 2) / scale;
    const newCenterWorldY = targetWorld.y - (mouseY - canvasSize.height / 2) / scale;
    const newCenter = worldToLonLat(newCenterWorldX, newCenterWorldY);

    setZoomLevel(nextZoom);
    setMapCenter(newCenter);
  };

  /* =========================================================================
     Mouse Navigation & Drawing Handlers
  ========================================================================= */

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle click (button 1) or Right click (button 2) or Spacebar held or PAN mode
    if (e.button === 1 || e.button === 2 || isSpacePressedRef.current || mapMode === "PAN" || !isDrawing) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        centerWorld: lonLatToWorld(mapCenter.lon, mapCenter.lat),
      };
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = mapContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Panning execution
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      const scale = 256 * Math.pow(2, zoomLevel);

      const newWorldX = panStartRef.current.centerWorld.x - dx / scale;
      const newWorldY = panStartRef.current.centerWorld.y - dy / scale;
      const newCenter = worldToLonLat(newWorldX, newWorldY);
      setMapCenter(newCenter);
      return;
    }

    // Node dragging execution
    if (draggingNodeIndex !== null && isDrawing) {
      const coord = pixelToCoord(x, y, mapCenter.lon, mapCenter.lat, zoomLevel, canvasSize.width, canvasSize.height);
      setDraftNodes((prev) => {
        const copy = [...prev];
        copy[draggingNodeIndex] = [coord.lon, coord.lat];
        return copy;
      });
      setCursorCoord(coord);
      setCursorScreenPos({ x, y });
      return;
    }

    const coord = pixelToCoord(x, y, mapCenter.lon, mapCenter.lat, zoomLevel, canvasSize.width, canvasSize.height);
    setCursorCoord(coord);
    setCursorScreenPos({ x, y });

    // Snapping detection: Check if cursor is near the first node to close polygon
    if (isDrawing && draftNodes.length >= 2) {
      const startPixel = coordToPixel(
        draftNodes[0][0],
        draftNodes[0][1],
        mapCenter.lon,
        mapCenter.lat,
        zoomLevel,
        canvasSize.width,
        canvasSize.height
      );
      const dist = Math.hypot(startPixel.x - x, startPixel.y - y);
      setIsSnappedToStart(dist <= 16);
    } else {
      setIsSnappedToStart(false);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
    setDraggingNodeIndex(null);
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // If was panning, don't place node
    if (isPanning) return;
    if (!isDrawing) return;

    // If snapped to start node, auto-close and finish
    if (isSnappedToStart && draftNodes.length >= 3) {
      handleCompleteDrawing();
      return;
    }

    // If clicking on an existing node, don't add duplicate
    if (hoveredNodeIndex !== null) return;

    const container = mapContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const coord = pixelToCoord(x, y, mapCenter.lon, mapCenter.lat, zoomLevel, canvasSize.width, canvasSize.height);
    setDraftNodes((prev) => [...prev, [coord.lon, coord.lat]]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setMapMode("DRAW");
    setDraftNodes([]);
    setStatusMessage({
      text: "Drawing Mode Active: Click to place nodes with precision. Hover near first point to snap and close.",
    });
  };

  const handleEditZoneGeometry = (zone: PricingZoneItem) => {
    if (!zone.geometry) return;
    let coords: Array<[number, number]> = [];
    if (zone.geometry.type === "Polygon" && Array.isArray(zone.geometry.coordinates)) {
      coords = zone.geometry.coordinates[0] || [];
    } else if (zone.geometry.type === "MultiPolygon" && Array.isArray(zone.geometry.coordinates)) {
      coords = zone.geometry.coordinates[0]?.[0] || [];
    }
    // Remove closing duplicate if present
    if (coords.length > 1 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
      coords = coords.slice(0, -1);
    }
    setDraftNodes(coords);
    setIsDrawing(true);
    setMapMode("DRAW");
    setEditingZone(zone);
    setZoneName(zone.name);
    setZoneState(zone.state);
    setZoneDesc(zone.description || "");
    setZoneColor(zone.color || "#3b82f6");
    setZonePriority(String(zone.priority ?? 20));
    setZoneQuoteOnly(zone.quoteOnly);
    setZoneOutOfArea(zone.outOfArea);
    setZoneBasePrice(zone.basePrice !== null ? String(zone.basePrice) : "");
    setZoneBands(zone.bands.map((b) => ({ maxAcres: b.maxAcres, price: b.price })));

    // Zoom into the zone's center
    if (coords.length > 0) {
      const avgLon = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
      const avgLat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
      setMapCenter({ lon: avgLon, lat: avgLat });
      setZoomLevel(12);
    }

    setStatusMessage({
      text: `Editing boundaries for ${zone.name}. Drag vertices to adjust, click map to add nodes, or Complete when done.`,
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
    (window as any).__tempDrawnGeometry = newGeometry;

    if (!editingZone) {
      // Open zone creation form pre-filled with drawn geometry
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
    }
    setIsZoneModalOpen(true);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDraftNodes([]);
    setStatusMessage(null);
  };

  // Search Address or Jump to Location
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchingLocation(true);
    try {
      // 1. Check if matches preset
      const queryLower = searchQuery.toLowerCase();
      for (const [key, preset] of Object.entries(REGIONAL_VIEWPORTS)) {
        if (preset.name.toLowerCase().includes(queryLower) || key.toLowerCase() === queryLower) {
          setMapCenter({ lat: preset.lat, lon: preset.lon });
          setZoomLevel(preset.zoom);
          setSearchingLocation(false);
          return;
        }
      }

      // 2. OpenStreetMap Nominatim Geocoding
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=us&limit=1`
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          setMapCenter({ lat, lon });
          setZoomLevel(14);
          setStatusMessage({ text: `Centered map on: ${results[0].display_name}` });
          return;
        }
      }
      setStatusMessage({ text: `Location "${searchQuery}" not found. Try a city, state, or county name.`, isError: true });
    } catch (err: any) {
      console.warn("Geocoding failed:", err);
      setStatusMessage({ text: "Could not locate address. Try specifying state/zip code.", isError: true });
    } finally {
      setSearchingLocation(false);
    }
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
      setZoneBands(zone.bands.map((b) => ({ maxAcres: b.maxAcres, price: b.price })));
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
      setDraftNodes([]);
      setStatusMessage({ text: `Zone "${zoneName}" saved successfully with precision map geometry.` });
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

  /* =========================================================================
     Slippy Tile Grid Generator for High-Res Satellite and Street Views
  ========================================================================= */
  const slippyTiles = useMemo(() => {
    const z = Math.max(1, Math.min(19, Math.floor(zoomLevel)));
    const scale = 256 * Math.pow(2, zoomLevel);
    const centerWorld = lonLatToWorld(mapCenter.lon, mapCenter.lat);

    // Bounding world coordinates of visible viewport
    const minWorldX = centerWorld.x - canvasSize.width / 2 / scale;
    const maxWorldX = centerWorld.x + canvasSize.width / 2 / scale;
    const minWorldY = centerWorld.y - canvasSize.height / 2 / scale;
    const maxWorldY = centerWorld.y + canvasSize.height / 2 / scale;

    const numTiles = Math.pow(2, z);
    const minTileX = Math.max(0, Math.floor(minWorldX * numTiles) - 1);
    const maxTileX = Math.min(numTiles - 1, Math.floor(maxWorldX * numTiles) + 1);
    const minTileY = Math.max(0, Math.floor(minWorldY * numTiles) - 1);
    const maxTileY = Math.min(numTiles - 1, Math.floor(maxWorldY * numTiles) + 1);

    const tileList: Array<{
      key: string;
      x: number;
      y: number;
      z: number;
      left: number;
      top: number;
      width: number;
      height: number;
      src: string;
      labelSrc?: string;
    }> = [];

    const tileSize = 256 * Math.pow(2, zoomLevel - z);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const tileWorldX = tx / numTiles;
        const tileWorldY = ty / numTiles;

        const left = canvasSize.width / 2 + (tileWorldX - centerWorld.x) * scale;
        const top = canvasSize.height / 2 + (tileWorldY - centerWorld.y) * scale;

        let src = "";
        let labelSrc: string | undefined;

        if (mapType === "SATELLITE" || mapType === "HYBRID") {
          src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`;
          if (mapType === "HYBRID") {
            labelSrc = `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${ty}/${tx}`;
          }
        } else if (mapType === "STREET") {
          src = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${ty}/${tx}`;
        } else if (mapType === "TOPO") {
          src = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${ty}/${tx}`;
        }

        tileList.push({
          key: `${z}-${tx}-${ty}`,
          x: tx,
          y: ty,
          z,
          left,
          top,
          width: tileSize,
          height: tileSize,
          src,
          labelSrc,
        });
      }
    }

    return tileList;
  }, [mapCenter, zoomLevel, mapType, canvasSize]);

  /* =========================================================================
     Render Saved GeoJSON Polygons in SVG
  ========================================================================= */
  const renderPolygons = useMemo(() => {
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
            const { x, y } = coordToPixel(
              pt[0],
              pt[1],
              mapCenter.lon,
              mapCenter.lat,
              zoomLevel,
              canvasSize.width,
              canvasSize.height
            );
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
              strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
              strokeDasharray={zone.quoteOnly ? "4,3" : undefined}
              className="cursor-pointer transition-all duration-200 hover:brightness-110"
              onMouseEnter={() => setHoveredZoneId(zone.id)}
              onMouseLeave={() => setHoveredZoneId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedZoneOnMap(zone);
              }}
            />
          </g>
        );
      });
    });
  }, [zones, mapCenter, zoomLevel, hoveredZoneId, selectedZoneOnMap, canvasSize]);

  // Live draft polygon statistics
  const draftStats = useMemo(() => {
    if (draftNodes.length === 0) return null;
    let perimeterFeet = 0;
    for (let i = 0; i < draftNodes.length - 1; i++) {
      perimeterFeet += getDistanceFeet(
        draftNodes[i][0],
        draftNodes[i][1],
        draftNodes[i + 1][0],
        draftNodes[i + 1][1]
      );
    }
    const areaAcres = getPolygonAreaAcres(draftNodes);
    return {
      nodesCount: draftNodes.length,
      perimeterFeet,
      perimeterMiles: (perimeterFeet / 5280).toFixed(2),
      areaAcres,
    };
  }, [draftNodes]);

  // Zoom Description Label
  const getZoomDescription = (z: number) => {
    if (z >= 17) return "Parcel / Boundary Level (High Precision)";
    if (z >= 14) return "Street / Neighborhood Level";
    if (z >= 11) return "Town / Township Level";
    if (z >= 8) return "County / Regional Level";
    return "State / Continental View";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
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
              Draw and configure high-precision geographic service polygons, acreage rate bands, and automatic territory add-ons.
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
            className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
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
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
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
                {st === "ALL"
                  ? "All Territories"
                  : st === "NY"
                  ? "New York (NY)"
                  : st === "NC"
                  ? "North Carolina (NC)"
                  : "Florida (FL)"}
              </button>
            ))}
          </div>

          {activeTab === "MAP" && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Jump Presets */}
              <div className="flex items-center space-x-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Quick Focus:
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    const preset = REGIONAL_VIEWPORTS[e.target.value];
                    if (preset) {
                      setMapCenter({ lat: preset.lat, lon: preset.lon });
                      setZoomLevel(preset.zoom);
                    }
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value="" disabled>
                    -- Select Territory Focus --
                  </option>
                  <option value="LI_WEST">Nassau County (NY)</option>
                  <option value="LI_EAST">Suffolk County (NY)</option>
                  <option value="RALEIGH">Raleigh Metro (NC)</option>
                  <option value="CLAYTON">Clayton / Johnston (NC)</option>
                  <option value="ORLANDO">Orlando Metro (FL)</option>
                </select>
              </div>

              {/* Location Search Bar */}
              <form onSubmit={handleLocationSearch} className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search address, town, or zip..."
                    className="w-48 sm:w-64 pl-7 pr-7 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={searchingLocation}
                  className="ml-1 px-2.5 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold transition"
                >
                  {searchingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* TAB 1: INTERACTIVE MAP DRAWING WORKSPACE */}
        {activeTab === "MAP" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Map Canvas - 3 Columns */}
            <div className="lg:col-span-3 space-y-2">
              {/* Map Toolbar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {!isDrawing ? (
                    <button
                      type="button"
                      onClick={handleStartDrawing}
                      className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Draw New Polygon Zone
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCompleteDrawing}
                        disabled={draftNodes.length < 3}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow animate-pulse"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Complete Zone ({draftNodes.length} pts)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftNodes(draftNodes.slice(0, -1))}
                        disabled={draftNodes.length === 0}
                        className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg disabled:opacity-50"
                        title="Undo last node (Ctrl+Z)"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftNodes([])}
                        disabled={draftNodes.length === 0}
                        className="inline-flex items-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg disabled:opacity-50"
                        title="Clear all points"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDrawing}
                        className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Mode Selector (Draw vs Pan) */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setMapMode("DRAW")}
                      className={`px-2 py-1 rounded flex items-center ${
                        mapMode === "DRAW"
                          ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="Draw Mode: Click to add polygon nodes"
                    >
                      <Crosshair className="w-3 h-3 mr-1" />
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapMode("PAN")}
                      className={`px-2 py-1 rounded flex items-center ${
                        mapMode === "PAN"
                          ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="Pan Mode: Click and drag to move map"
                    >
                      <Move className="w-3 h-3 mr-1" />
                      Pan
                    </button>
                  </div>

                  {/* Layer Tile Mode */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                    {(["HYBRID", "SATELLITE", "STREET", "TOPO"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMapType(type)}
                        className={`px-2 py-1 rounded capitalize ${
                          mapType === type
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {type.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom Controls & Level Indicator */}
                <div className="flex items-center space-x-2">
                  <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    z{zoomLevel.toFixed(1)}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(19, z + 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shadow-xs transition"
                      title="Zoom In (Scroll up or click)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(4, z - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shadow-xs transition"
                      title="Zoom Out (Scroll down or click)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Canvas Frame */}
              <div
                ref={mapContainerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                className={`relative w-full h-[660px] bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner select-none ${
                  isPanning
                    ? "cursor-grabbing"
                    : mapMode === "PAN"
                    ? "cursor-grab"
                    : isDrawing
                    ? isSnappedToStart
                      ? "cursor-pointer"
                      : "cursor-crosshair"
                    : "cursor-default"
                }`}
              >
                {/* 1. Slippy Tile Layer: High-Res Satellite / Streets */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {slippyTiles.map((tile) => (
                    <div
                      key={tile.key}
                      className="absolute"
                      style={{
                        left: `${tile.left}px`,
                        top: `${tile.top}px`,
                        width: `${tile.width}px`,
                        height: `${tile.height}px`,
                      }}
                    >
                      <img
                        src={tile.src}
                        alt=""
                        className="w-full h-full object-cover select-none"
                        loading="eager"
                        crossOrigin="anonymous"
                      />
                      {tile.labelSrc && (
                        <img
                          src={tile.labelSrc}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover select-none opacity-90"
                          loading="eager"
                          crossOrigin="anonymous"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* 2. SVG Layer for Polygons, Draft Nodes & Precision Crosshairs */}
                <svg
                  ref={mapSvgRef}
                  viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                  className="absolute inset-0 w-full h-full z-10"
                  onClick={handleMapClick}
                >
                  {/* Precision Crosshair Lines in Drawing Mode */}
                  {isDrawing && cursorScreenPos && !isPanning && (
                    <g className="pointer-events-none opacity-40">
                      <line
                        x1={0}
                        y1={cursorScreenPos.y}
                        x2={canvasSize.width}
                        y2={cursorScreenPos.y}
                        stroke="#38bdf8"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                      <line
                        x1={cursorScreenPos.x}
                        y1={0}
                        x2={cursorScreenPos.x}
                        y2={canvasSize.height}
                        stroke="#38bdf8"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                    </g>
                  )}

                  {/* Render Saved Zone Polygons */}
                  {renderPolygons}

                  {/* Render Current Draft Polygon Nodes */}
                  {isDrawing && draftNodes.length > 0 && (
                    <g>
                      {/* Polygon Filled Preview Area */}
                      {draftNodes.length >= 3 && (
                        <polygon
                          points={draftNodes
                            .map((pt) => {
                              const { x, y } = coordToPixel(
                                pt[0],
                                pt[1],
                                mapCenter.lon,
                                mapCenter.lat,
                                zoomLevel,
                                canvasSize.width,
                                canvasSize.height
                              );
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="#10b981"
                          fillOpacity="0.25"
                          stroke="none"
                        />
                      )}

                      {/* Connecting line between placed nodes */}
                      <polyline
                        points={draftNodes
                          .map((pt) => {
                            const { x, y } = coordToPixel(
                              pt[0],
                              pt[1],
                              mapCenter.lon,
                              mapCenter.lat,
                              zoomLevel,
                              canvasSize.width,
                              canvasSize.height
                            );
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4,4"
                      />

                      {/* Live Rubber-Band Line to Current Mouse Cursor */}
                      {cursorScreenPos && !isPanning && (
                        <line
                          x1={
                            coordToPixel(
                              draftNodes[draftNodes.length - 1][0],
                              draftNodes[draftNodes.length - 1][1],
                              mapCenter.lon,
                              mapCenter.lat,
                              zoomLevel,
                              canvasSize.width,
                              canvasSize.height
                            ).x
                          }
                          y1={
                            coordToPixel(
                              draftNodes[draftNodes.length - 1][0],
                              draftNodes[draftNodes.length - 1][1],
                              mapCenter.lon,
                              mapCenter.lat,
                              zoomLevel,
                              canvasSize.width,
                              canvasSize.height
                            ).y
                          }
                          x2={cursorScreenPos.x}
                          y2={cursorScreenPos.y}
                          stroke={isSnappedToStart ? "#22c55e" : "#38bdf8"}
                          strokeWidth="2"
                          strokeDasharray="2,2"
                        />
                      )}

                      {/* Vertex Handles & Index Numbers */}
                      {draftNodes.map((pt, idx) => {
                        const { x, y } = coordToPixel(
                          pt[0],
                          pt[1],
                          mapCenter.lon,
                          mapCenter.lat,
                          zoomLevel,
                          canvasSize.width,
                          canvasSize.height
                        );
                        const isStart = idx === 0;
                        const isHovered = hoveredNodeIndex === idx;

                        return (
                          <g
                            key={idx}
                            onMouseEnter={() => setHoveredNodeIndex(idx)}
                            onMouseLeave={() => setHoveredNodeIndex(null)}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingNodeIndex(idx);
                            }}
                            className="cursor-move"
                          >
                            {/* Snap Target Pulse on Starting Node */}
                            {isStart && isSnappedToStart && (
                              <circle
                                cx={x}
                                cy={y}
                                r="14"
                                fill="#22c55e"
                                fillOpacity="0.4"
                                className="animate-ping"
                              />
                            )}

                            {/* Node Handle Circle */}
                            <circle
                              cx={x}
                              cy={y}
                              r={isStart ? (isSnappedToStart ? "8" : "7") : isHovered ? "6" : "4.5"}
                              fill={isStart ? "#10b981" : isHovered ? "#38bdf8" : "#ffffff"}
                              stroke={isStart ? "#ffffff" : "#10b981"}
                              strokeWidth={isHovered ? "2.5" : "2"}
                              className="transition-all"
                            />

                            {/* Node Index Badge */}
                            <text
                              x={x + 9}
                              y={y - 7}
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                              stroke="#000000"
                              strokeWidth="2.5"
                              paintOrder="stroke"
                              className="pointer-events-none select-none"
                            >
                              #{idx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                </svg>

                {/* Drawing & Accuracy Overlay Bar */}
                {isDrawing && (
                  <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl border border-emerald-500/80 shadow-2xl text-xs space-y-2 max-w-sm pointer-events-none z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                        <Crosshair className="w-4 h-4 animate-spin" />
                        <span>Precision Polygon Editor</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-700">
                        {draftNodes.length} Nodes
                      </span>
                    </div>

                    {isSnappedToStart ? (
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/50 font-bold text-[11px] animate-pulse">
                        🎯 Snapped to Start Pin! Click now to close & save polygon.
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Click on the map to place boundary pins. Scroll wheel to zoom in to parcel level. Drag any vertex to reposition.
                      </p>
                    )}

                    {draftStats && draftStats.nodesCount >= 2 && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Perimeter</span>
                          <span className="font-bold text-slate-100">
                            {draftStats.perimeterFeet.toLocaleString()} ft ({draftStats.perimeterMiles} mi)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Approx Area</span>
                          <span className="font-bold text-emerald-400">
                            {draftStats.areaAcres.toLocaleString()} Acres
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Coordinate Tracker & Scale Badge (Bottom Left) */}
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/60 shadow text-[11px] text-slate-300 font-mono flex items-center space-x-3 pointer-events-none z-20">
                  <div className="flex items-center space-x-1.5">
                    <Navigation className="w-3 h-3 text-blue-400" />
                    <span>
                      {cursorCoord
                        ? `Lat: ${cursorCoord.lat.toFixed(6)}, Lon: ${cursorCoord.lon.toFixed(6)}`
                        : `Center: ${mapCenter.lat.toFixed(4)}, ${mapCenter.lon.toFixed(4)}`}
                    </span>
                  </div>
                  <span className="text-slate-500">|</span>
                  <span className="text-blue-300 font-sans font-semibold">{getZoomDescription(zoomLevel)}</span>
                </div>

                {/* Helper Controls Hint (Bottom Right) */}
                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700/60 shadow text-[10px] text-slate-400 font-sans flex items-center space-x-2 pointer-events-none z-20">
                  <span>Hold <strong className="text-slate-200">Space</strong> or <strong className="text-slate-200">Right-Click</strong> to Pan</span>
                  <span>•</span>
                  <span><strong className="text-slate-200">Scroll</strong> to Zoom</span>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Selected / Highlighted Zone Details */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
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
                          onClick={() => handleEditZoneGeometry(selectedZoneOnMap)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition"
                          title="Redraw or fine-tune boundary nodes"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenZoneModal(selectedZoneOnMap)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition"
                          title="Edit Zone Details & Pricing"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(selectedZoneOnMap)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
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

                    {/* Redraw Geometry Action */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleEditZoneGeometry(selectedZoneOnMap)}
                        className="w-full inline-flex items-center justify-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                      >
                        <Crosshair className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Adjust Zone Nodes on Map
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-2 text-slate-400">
                    <MousePointer className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs">
                      Click any polygon on the map to inspect its pricing tiers, or click "Draw New Polygon Zone" to create a new one.
                    </p>
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
                    onClick={() => {
                      setSelectedZoneOnMap(z);
                      if (z.geometry) {
                        let coords: Array<[number, number]> = [];
                        if (z.geometry.type === "Polygon" && Array.isArray(z.geometry.coordinates)) {
                          coords = z.geometry.coordinates[0] || [];
                        } else if (z.geometry.type === "MultiPolygon" && Array.isArray(z.geometry.coordinates)) {
                          coords = z.geometry.coordinates[0]?.[0] || [];
                        }
                        if (coords.length > 0) {
                          const avgLon = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
                          const avgLat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
                          setMapCenter({ lon: avgLon, lat: avgLat });
                          setZoomLevel(11);
                        }
                      }
                    }}
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
                  <div
                    key={addon.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                  >
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
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
