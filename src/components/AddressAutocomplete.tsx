"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Search } from "lucide-react";

export interface AddressSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export interface AddressAutocompleteProps {
  onPlaceSelected: (place: any) => void;
  onManualChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({
  onPlaceSelected,
  onManualChange,
  value,
  defaultValue,
  placeholder = "Start typing an address or property location...",
  className = "w-full px-3 py-2 bg-blue-50/50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500",
  required = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || defaultValue || "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Synchronize internal state with external controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Load Google Maps JS SDK dynamically on client if key is configured and not yet present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (apiKey && !apiKey.includes("Placeholder") && !(window as any).google?.maps?.places) {
      const existingScript = document.getElementById("google-maps-autocomplete-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-maps-autocomplete-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, [apiKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Dual-mode fetch suggestions: Server Proxy + Browser SDK Fallback
  const fetchPredictions = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      let foundSuggestions = false;

      // 1. First query Next.js Server API route (Places API New proxy)
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setShowDropdown(true);
            foundSuggestions = true;
          }
        }
      } catch (err) {
        console.warn("Server autocomplete route failed or unavailable, checking client SDK fallback:", err);
      }

      // 2. Client SDK Fallback: If server route returns empty or fails, use browser window.google.maps.places
      if (
        !foundSuggestions &&
        typeof window !== "undefined" &&
        (window as any).google?.maps?.places?.AutocompleteService
      ) {
        try {
          const service = new (window as any).google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            { input: query, componentRestrictions: { country: "us" } },
            (predictions: any[]) => {
              if (predictions && predictions.length > 0) {
                setSuggestions(
                  predictions.map((p) => ({
                    placeId: p.place_id,
                    text: p.description,
                    mainText: p.structured_formatting?.main_text || p.description,
                    secondaryText: p.structured_formatting?.secondary_text || "",
                  }))
                );
                setShowDropdown(true);
              } else {
                setSuggestions([]);
                setShowDropdown(false);
              }
              setLoading(false);
            }
          );
          return;
        } catch (sdkErr) {
          console.warn("Client AutocompleteService error:", sdkErr);
        }
      }

      if (!foundSuggestions) {
        setSuggestions([]);
      }
      setLoading(false);
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedIndex(-1);

    if (onManualChange) {
      onManualChange(val);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 250);
  };

  const handleSelectPlace = async (placeId: string, fallbackText?: string) => {
    setShowDropdown(false);
    setLoading(true);

    let placeData: any = null;

    // 1. Query Server API route for place details
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
      if (res.ok) {
        placeData = await res.json();
      }
    } catch (err) {
      console.warn("Server place details route failed, attempting client SDK fallback:", err);
    }

    // 2. Client SDK Fallback for place details
    if (!placeData && typeof window !== "undefined" && (window as any).google?.maps?.places?.PlacesService) {
      try {
        const dummyDiv = document.createElement("div");
        const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
        await new Promise<void>((resolve) => {
          service.getDetails(
            {
              placeId,
              fields: ["formatted_address", "address_components", "geometry", "name"],
            },
            (result: any, status: any) => {
              if (status === "OK" && result) {
                placeData = result;
              }
              resolve();
            }
          );
        });
      } catch (sdkErr) {
        console.warn("Client PlacesService error:", sdkErr);
      }
    }

    setLoading(false);

    // Normalize output object so callers can consume geometry / address_components reliably
    const selectedAddress =
      placeData?.formatted_address ||
      placeData?.formattedAddress ||
      placeData?.name ||
      fallbackText ||
      inputValue;

    setInputValue(selectedAddress);
    if (onManualChange) {
      onManualChange(selectedAddress);
    }

    if (placeData) {
      // Ensure compatibility with both function-based lat()/lng() and numeric fields
      const rawLat =
        typeof placeData.geometry?.location?.lat === "function"
          ? placeData.geometry.location.lat()
          : placeData.geometry?.location?.lat ?? placeData.location?.latitude ?? null;

      const rawLng =
        typeof placeData.geometry?.location?.lng === "function"
          ? placeData.geometry.location.lng()
          : placeData.geometry?.location?.lng ?? placeData.location?.longitude ?? null;

      const rawComponents =
        placeData.address_components ||
        (placeData.addressComponents || []).map((c: any) => ({
          long_name: c.longText || c.long_name || "",
          short_name: c.shortText || c.short_name || "",
          types: c.types || [],
        }));

      const countyObj = rawComponents.find((c: any) =>
        (c.types || []).includes("administrative_area_level_2")
      );
      const county = countyObj
        ? (countyObj.long_name || countyObj.longText || "").replace(" County", "")
        : "";

      const normalizedPlace = {
        ...placeData,
        place_id: placeId,
        formatted_address: selectedAddress,
        formattedAddress: selectedAddress,
        name: placeData.name || placeData.displayName?.text || selectedAddress,
        county,
        address_components: rawComponents,
        addressComponents: rawComponents,
        location: {
          latitude: rawLat,
          longitude: rawLng,
        },
        geometry: {
          location: {
            lat: () => rawLat,
            lng: () => rawLng,
            latitude: rawLat,
            longitude: rawLng,
          },
        },
      };

      onPlaceSelected(normalizedPlace);
    } else {
      onPlaceSelected({
        formatted_address: selectedAddress,
        name: selectedAddress,
        county: "",
        address_components: [],
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        handleSelectPlace(selected.placeId, selected.text);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setShowDropdown(false);
    if (onManualChange) {
      onManualChange("");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className={className}
          required={required}
          autoComplete="off"
        />

        <div className="absolute right-2.5 flex items-center space-x-1.5 pointer-events-auto">
          {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {!loading && inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear address"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestion Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
          {suggestions.map((s, index) => (
            <button
              key={s.placeId || index}
              type="button"
              onMouseDown={(e) => {
                // Prevents input blur before selection completes
                e.preventDefault();
                handleSelectPlace(s.placeId, s.text);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2.5 transition-colors flex items-start space-x-2.5 ${
                index === selectedIndex
                  ? "bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-blue-100"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
              }`}
            >
              <MapPin className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                  {s.mainText}
                </div>
                {s.secondaryText && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {s.secondaryText}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
