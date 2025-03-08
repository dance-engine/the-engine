import { useState } from "react";
import Select from "react-select";

export default function VenueSearch({ onSelect }) {
  const [options, setOptions] = useState([]);

  const fetchVenues = async (query) => {
    if (!query) return;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
    );
    const data = await response.json();

    setOptions(
      data.map((place) => ({
        value: place,
        label: `${place.display_name} (${place.type})`,
      }))
    );
  };

  return (
    <Select
      onInputChange={fetchVenues}
      options={options}
      onChange={(selected) => {
        if (selected) {
          const { lat, lon, display_name } = selected.value;
          onSelect({ lat: parseFloat(lat), lng: parseFloat(lon), name: display_name });
        }
      }}
      placeholder="Search for a venue..."
      isClearable
    />
  );
}
