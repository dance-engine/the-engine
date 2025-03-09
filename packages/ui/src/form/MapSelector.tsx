'use client';
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Define prop types
interface MapSelectorProps {
  latitude: number;
  longitude: number;
  venueName: string;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

export default function MapSelector({ latitude, longitude, venueName, onLocationSelect }: MapSelectorProps) {
  const [mapCenter, setMapCenter] = useState({ lat: latitude, lng: longitude });

  useEffect(() => {
    setMapCenter({ lat: latitude, lng: longitude });
  }, [latitude, longitude]);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
        setMapCenter({ lat, lng });
      },
    });

    return <Marker position={mapCenter} icon={new L.Icon.Default()} draggable />;
  }

  return (
    <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "300px" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
}
