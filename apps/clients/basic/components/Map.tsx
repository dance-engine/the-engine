'use client'
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapDisplay = ({ lat, lng }: {lat: number, lng: number}) => {
  const [position, setPosition] = useState({ lat, lng } as L.LatLngLiteral);

  const CenterMap = ({position}: {position: L.LatLngLiteral}) => {
    const map = useMap();
  
    useEffect(() => {
      map.setView(position, map.getZoom(), { animate: true });
    }, [position, map]);
  
    return null;
  };

  useEffect(()=>{
    setPosition({lat,lng})
  },[lat,lng])


  return (
    <div className="border p-[1px] rounded-md border-gray-300 bg-gray-200">
      <MapContainer center={position} zoom={10} style={{ height: "300px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CenterMap position={position} />
        <Marker
        position={position}
        draggable
        icon={customIcon}
      />
      </MapContainer>
    </div>
    );
}

export default MapDisplay;