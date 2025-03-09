"use client";

import { useState, useEffect, useRef } from "react";
import Select from "react-select";

// ✅ Type for venue selection
export type Venue = {
  lat: number;
  lng: number;
  name: string;
};

// ✅ Define prop types for component
interface VenueSearchProps {
  onSelect: (venue: Venue) => void;
  mapCenter: { lat: number; lng: number };
}

export default function VenueSearch({ onSelect, mapCenter }: VenueSearchProps) {
  const [options, setOptions] = useState<{ value: any; label: string }[]>([]);
  const [query, setQuery] = useState(""); // ✅ Query state, separate from API call
  const debounceRef = useRef<NodeJS.Timeout | null>(null); // ✅ Store debounce timer
  const mapCenterRef = useRef(mapCenter); // ✅ Store latest `mapCenter` without triggering re-renders

  useEffect(() => {
    mapCenterRef.current = mapCenter; // ✅ Keep latest mapCenter updated without re-renders
  }, [mapCenter]);

  // ✅ Fetch venues with debounce (triggers only once per second)
  useEffect(() => {
    if (!query.trim()) return; // Ignore empty input

    if (debounceRef.current) {
      clearTimeout(debounceRef.current); // ✅ Cancel previous debounce call
    }

    debounceRef.current = setTimeout(async () => {
      const { lat, lng } = mapCenterRef.current; // ✅ Use latest `mapCenter`

      const minLat = lat - 0.9;
      const maxLat = lat + 0.9;
      const minLon = lng - 0.9;
      const maxLon = lng + 0.9;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}
          &limit=10&bounded=1&viewbox=${minLon},${minLat},${maxLon},${maxLat}`
        );
        const data = await response.json();

        setOptions(
          data.map((place: any) => ({
            value: place,
            label: `${place.display_name} (${place.type})`,
          }))
        );
      } catch (error) {
        console.error("Error fetching venue data:", error);
      }
    }, 1000); // ✅ Debounce API call

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current); // ✅ Cleanup debounce on unmount
    };
  }, [query]); // ✅ Effect runs only when query changes

  return (
    <Select
      onInputChange={(input) => {
        if (typeof input === "string") {
          setQuery(input.trim()); // ✅ Updates query state, does NOT trigger API call immediately
        }
      }}
      options={options}
      onChange={(selected) => {
        if (selected) {
          const { lat, lon, display_name } = selected.value;
          onSelect({ lat: parseFloat(lat), lng: parseFloat(lon), name: display_name });
        }
      }}
      placeholder="Search for a venue..."
      isClearable
      className="z-10"
    />
  );
}
