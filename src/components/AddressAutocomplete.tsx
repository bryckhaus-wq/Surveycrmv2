"use client";

import React, { useState, useEffect } from "react";
import ReactGoogleAutocomplete from "react-google-autocomplete";
import { MapPin } from "lucide-react";

interface AddressAutocompleteProps {
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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasValidApiKey =
    Boolean(apiKey) &&
    typeof apiKey === "string" &&
    apiKey.trim().length > 10 &&
    !apiKey.includes("Placeholder");

  const [inputValue, setInputValue] = useState(value || defaultValue || "");

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    if (onManualChange) {
      onManualChange(newVal);
    }
  };

  if (hasValidApiKey) {
    return (
      <div className="relative">
        <ReactGoogleAutocomplete
          apiKey={apiKey}
          onPlaceSelected={(place: any) => {
            if (place) {
              const formatted = place.formatted_address || place.name || "";
              setInputValue(formatted);
              onPlaceSelected(place);
            }
          }}
          options={{
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "us" },
          }}
          placeholder={placeholder}
          defaultValue={inputValue}
          className={className}
          required={required}
        />
      </div>
    );
  }

  // Graceful fallback when Google Maps API key is not configured in environment
  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        required={required}
      />
    </div>
  );
}
