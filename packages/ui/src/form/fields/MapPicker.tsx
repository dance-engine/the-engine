'use client'
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface MapPickerProps {
  lat: number, 
  lng: number, 
  onChange: (latlng: L.LatLngLiteral) => void
}

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }: MapPickerProps) => {
  const [position, setPosition] = useState({ lat, lng } as L.LatLngLiteral);

  const CenterMap: React.FC<{position: L.LatLngLiteral}> = ({position}) => {
    const map = useMap();
  
    useEffect(() => {
      map.setView(position, map.getZoom(), { animate: true });
    }, [position, map]);
  
    return null;
  };

  
  const DraggableMarker = () => {
    useMapEvents({
      click(e: L.LeafletMouseEvent) {
        setPosition(e.latlng);
        onChange(e.latlng);
      },
    });

    return (
      <Marker
        position={position}
        draggable
        icon={customIcon}
        eventHandlers={{
          dragend: (e: L.LeafletEvent) => {
            const newCoords = e.target.getLatLng();
            setPosition(newCoords);
            onChange(newCoords);
          },
        }}
      />
    );
  };

  useEffect(()=>{
    setPosition({lat,lng})
  },[lat,lng])

  return (
    <div>
      <MapContainer center={position} zoom={17} style={{ height: "300px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DraggableMarker />
        <CenterMap position={position} />
      </MapContainer>
    </div>
    );
};

export default MapPicker;
