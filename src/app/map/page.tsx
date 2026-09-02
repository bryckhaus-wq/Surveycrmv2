"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import {
  MapPin,
  Users,
  Compass,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Home,
  CheckCircle2,
  Layers,
  Map as MapIcon,
  Navigation,
  Info,
} from "lucide-react";

interface FieldWorker {
  id: string;
  name: string;
  email: string;
  role: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  spoke?: { id: string; name: string; shortName: string } | null;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  latitude: number;
  longitude: number;
  surveyType?: { id: string; name: string } | null;
  assignedUser?: { id: string; name: string } | null;
  spoke?: { id: string; name: string; shortName: string } | null;
}

interface SpokeItem {
  id: string;
  name: string;
  shortName: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 40.6862,
  lng: -73.3736,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

export default function DispatcherMapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasValidApiKey =
    Boolean(apiKey) &&
    typeof apiKey === "string" &&
    apiKey.trim().length > 10 &&
    !apiKey.includes("Placeholder");

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: hasValidApiKey ? apiKey! : "",
  });

  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [spokes, setSpokes] = useState<SpokeItem[]>([]);
  const [selectedSpoke, setSelectedSpoke] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeMarker, setActiveMarker] = useState<{
    type: "WORKER" | "ORDER";
    data: FieldWorker | ActiveOrder;
  } | null>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    fetchSpokes();
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [selectedSpoke]);

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

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        spokeId: selectedSpoke,
      });

      const res = await fetch(`/api/map?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load dispatcher map data.");
      }
      const data = await res.json();
      setFieldWorkers(data.fieldWorkers || []);
      setActiveOrders(data.activeOrders || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // Compute dynamic center based on field workers or active orders
  const mapCenter = useMemo(() => {
    if (fieldWorkers.length > 0 && fieldWorkers[0].latitude && fieldWorkers[0].longitude) {
      return {
        lat: fieldWorkers[0].latitude,
        lng: fieldWorkers[0].longitude,
      };
    }
    if (activeOrders.length > 0 && activeOrders[0].latitude && activeOrders[0].longitude) {
      return {
        lat: activeOrders[0].latitude,
        lng: activeOrders[0].longitude,
      };
    }
    return defaultCenter;
  }, [fieldWorkers, activeOrders]);

  const handleFocusLocation = (lat: number, lng: number, item?: { type: "WORKER" | "ORDER"; data: FieldWorker | ActiveOrder }) => {
    if (item) {
      setActiveMarker(item);
    }
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(14);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Field Dispatcher Map</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                Live Routing
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize field party locations relative to pending work orders
            </p>
          </div>
        </div>

        {/* Branch Filter & Refresh */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
              Branch:
            </span>
            <select
              value={selectedSpoke}
              onChange={(e) => setSelectedSpoke(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {spokes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchMapData}
            disabled={loading}
            className="p-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Map Container & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[680px]">
        {/* Map View (3 cols on large screen) */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-950">
          {!hasValidApiKey ? (
            <div className="w-full h-full flex flex-col justify-between p-6 bg-slate-900 text-white relative overflow-hidden">
              <div className="space-y-4 max-w-xl z-10">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-950/80 border border-blue-800/60 rounded-full text-xs font-semibold text-blue-300">
                  <Info className="w-3.5 h-3.5" />
                  <span>Dispatcher Routing Active</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Fleet & Work Order Routing Overview
                </h3>
                <p className="text-xs text-slate-400">
                  Tracking {fieldWorkers.length} field specialist base locations and {activeOrders.length} pending field work orders across regional branches. Click any record in the dispatch sidebar to inspect details and coordinates.
                </p>

                {activeMarker && (
                  <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2 mt-4 text-xs animate-fadeIn">
                    <div className="font-bold text-sm text-blue-400 flex items-center justify-between">
                      <span>{activeMarker.type === "WORKER" ? (activeMarker.data as FieldWorker).name : `Order ${(activeMarker.data as ActiveOrder).orderNumber}`}</span>
                      <span className="text-[10px] bg-blue-950 px-2 py-0.5 rounded text-blue-300 font-mono">
                        {activeMarker.type}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      {(activeMarker.data as any).address}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400">
                      Coordinates: {activeMarker.data.latitude.toFixed(4)}, {activeMarker.data.longitude.toFixed(4)}
                    </div>
                    {activeMarker.type === "ORDER" && (
                      <div className="pt-2">
                        <Link
                          href={`/orders/${activeMarker.data.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                        >
                          View Order Details →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid representation */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
                <span className="flex items-center text-[11px]">
                  <Layers className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Map Tiles: Add <code className="mx-1 px-1 bg-slate-800 text-blue-300 rounded font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="mx-1 px-1 bg-slate-800 text-slate-300 rounded font-mono">.env</code> to activate satellite view.
                </span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {fieldWorkers.length} Workers • {activeOrders.length} Orders
                </span>
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Loading Google Maps...
              </p>
            </div>
          ) : loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-rose-600">
              <AlertCircle className="w-10 h-10 mb-2" />
              <p className="font-semibold text-sm">Google Maps API Error</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Unable to load map tiles. Verify your Google Maps API Key in configuration.
              </p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={11}
              options={mapOptions}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Plot Field Workers (Blue Marker) */}
              {fieldWorkers.map((worker) => (
                <Marker
                  key={`worker-${worker.id}`}
                  position={{
                    lat: worker.latitude,
                    lng: worker.longitude,
                  }}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                  title={`Field Worker: ${worker.name}`}
                  onClick={() =>
                    setActiveMarker({
                      type: "WORKER",
                      data: worker,
                    })
                  }
                />
              ))}

              {/* Plot Active Field Orders (Red Marker) */}
              {activeOrders.map((ord) => (
                <Marker
                  key={`order-${ord.id}`}
                  position={{
                    lat: ord.latitude,
                    lng: ord.longitude,
                  }}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  }}
                  title={`Order #${ord.orderNumber} - ${ord.clientName}`}
                  onClick={() =>
                    setActiveMarker({
                      type: "ORDER",
                      data: ord,
                    })
                  }
                />
              ))}

              {/* InfoWindow Popup */}
              {activeMarker && (
                <InfoWindow
                  position={{
                    lat: activeMarker.data.latitude,
                    lng: activeMarker.data.longitude,
                  }}
                  onCloseClick={() => setActiveMarker(null)}
                >
                  <div className="p-2 max-w-xs text-slate-900 font-sans">
                    {activeMarker.type === "WORKER" ? (
                      (() => {
                        const worker = activeMarker.data as FieldWorker;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1 text-blue-700 font-bold text-sm">
                              <Home className="w-3.5 h-3.5" />
                              <span>{worker.name}</span>
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                              Field Party Chief • Home Base
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {worker.address || "Registered Home Dispatch Base"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {worker.latitude.toFixed(4)}, {worker.longitude.toFixed(4)}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const order = activeMarker.data as ActiveOrder;
                        return (
                          <div className="space-y-1.5">
                            <div className="font-bold text-sm text-blue-700 flex items-center justify-between">
                              <span>Order {order.orderNumber}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                {order.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-800">
                              {order.clientName}
                            </div>
                            <div className="text-xs text-slate-600">
                              {order.address}, {order.city}, {order.state} {order.zip}
                            </div>
                            {order.surveyType && (
                              <div className="text-[11px] text-slate-500">
                                Type: {order.surveyType.name}
                              </div>
                            )}
                            <div className="pt-2">
                              <Link
                                href={`/orders/${order.id}`}
                                className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                View Order Details →
                              </Link>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 z-10">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
              <span>Map Legend</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className="text-slate-700 dark:text-slate-300">
                Field Workers ({fieldWorkers.length})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-700 dark:text-slate-300">
                Pending Field Orders ({activeOrders.length})
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar: Field Worker & Job List (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <Compass className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
            <span>Dispatch Fleet & Orders</span>
          </h2>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1 mt-2 space-y-4">
            {/* Field Workers Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span className="flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1 text-blue-500" />
                  Field Workers ({fieldWorkers.length})
                </span>
              </div>

              {fieldWorkers.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  No geocoded field workers found.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {fieldWorkers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleFocusLocation(w.latitude, w.longitude, { type: "WORKER", data: w })}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
                    >
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {w.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {w.address || "Home Base"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active Orders Section */}
            <div className="space-y-2 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-red-500" />
                  Pending Orders ({activeOrders.length})
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  No pending field orders with coordinates.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleFocusLocation(o.latitude, o.longitude, { type: "ORDER", data: o })}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {o.orderNumber}
                        </span>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                          {o.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {o.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {o.address}, {o.city}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
