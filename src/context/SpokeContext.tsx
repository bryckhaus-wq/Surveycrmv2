"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface SpokeOption {
  id: string;
  name: string;
  shortName: string;
  lbNumber?: string | null;
  dailyCapacity: number;
}

interface SpokeContextType {
  spokeId: string; // "ALL" or specific Spoke UUID
  setSpokeId: (id: string) => void;
  spokes: SpokeOption[];
  refreshSpokes: () => Promise<void>;
  activeSpoke: SpokeOption | null;
}

const SpokeContext = createContext<SpokeContextType | undefined>(undefined);

export function SpokeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [spokeId, setSpokeId] = useState<string>("ALL");
  const [spokes, setSpokes] = useState<SpokeOption[]>([]);

  useEffect(() => {
    fetchSpokes();
  }, []);

  const fetchSpokes = async () => {
    try {
      const res = await fetch("/api/admin/spokes");
      if (res.ok) {
        const data = await res.json();
        setSpokes(data);
      }
    } catch (err) {
      console.error("Failed to load spokes context:", err);
    }
  };

  const activeSpoke =
    spokeId === "ALL" ? null : spokes.find((s) => s.id === spokeId) || null;

  return (
    <SpokeContext.Provider
      value={{
        spokeId,
        setSpokeId,
        spokes,
        refreshSpokes: fetchSpokes,
        activeSpoke,
      }}
    >
      {children}
    </SpokeContext.Provider>
  );
}

export function useSpoke() {
  const context = useContext(SpokeContext);
  if (!context) {
    throw new Error("useSpoke must be used within a SpokeContextProvider");
  }
  return context;
}
