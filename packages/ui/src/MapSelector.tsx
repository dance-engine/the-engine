import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultPosition = { lat: 51.505, lng: -0.09 };

const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function CenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 13);
  }, [position, map]);
  return null;
}

export default function MapSelector({ latitude, longitude, venueName, onLocationSelect }) {
  const [position, setPosition] = useState({ lat: latitude || defaultPosition.lat, lng: longitude || defaultPosition.lng });

  useEffect(() => {
    if (venueName) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${venueName}&limit=1`)
        .then((res) => res.json())
        .then((data) => {
          if (data.length > 0) {
            const { lat, lon } = data[0];
            setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
            onLocationSelect(parseFloat(lat), parseFloat(lon));
          }
        })
        .catch((error) => console.error("Error fetching venue location:", error));
    }
  }, [venueName, onLocationSelect]);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        onLocationSelect(lat, lng);
      },
    });

    return <Marker position={position} icon={customIcon} draggable />;
  }

  return (
    <MapContainer center={position} zoom={13} style={{ width: "100%", height: "300px" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
      <CenterMap position={position} />
    </MapContainer>
  );
}
