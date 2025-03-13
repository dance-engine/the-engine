'use client'
import React, {useCallback, useState, useMemo, useEffect } from "react";
import { UseFormRegister, FieldValues, UseFormSetValue, Control } from "react-hook-form";
import AsyncSelect from "react-select/async";
import {SingleValue, StylesConfig } from 'react-select'
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent"; // Assuming CustomComponent is already defined
import debounce from 'debounce'; // Import debounce from the standalone library
import { MapPickerProps } from '@dance-engine/ui/form/fields/MapPicker'

interface LocationPickerProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate?: () => void;
  setValue: UseFormSetValue<FieldValues>;
  control: Control<FieldValues>;
  MapComponent?: React.FC<MapPickerProps>;
  error?: string;
  fieldSchema: ZodTypeAny; // This will be the location schema passed to each field
}

interface HereGeocodeResult {
  title: string; // Full formatted address
  id: string; // Unique identifier for the location
  resultType: string; // Type of result (e.g., "houseNumber", "street", "place", "locality")
  address: {
    label: string; // Formatted address
    countryCode: string; // Country code (e.g., "US")
    countryName: string; // Country name
    state?: string;
    county?: string;
    city?: string;
    district?: string;
    street?: string;
    postalCode?: string;
    houseNumber?: string;
  };
  position: {
    lat: number; // Latitude
    lng: number; // Longitude
  };
  access?: {
    lat: number;
    lng: number;
  }[]; // Alternative access points if available
}

export interface HereGeocodeResponse {
  items: HereGeocodeResult[]; // Array of geocoded locations
}

interface SelectOption {
  label: string,
  value: string
}

interface latlng {
  lat: number,
  lng: number
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  name,
  register,
  setValue,
  error,
  fieldSchema,
  MapComponent
}) => {

  const [mapCentre,setmapCentre] = useState({lat: 53.40262, lng: -2.96981 } as latlng)
  const [cachedOptions, setCachedOptions] = useState<SelectOption[]>([]); 
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const fetchLocationResults = async (inputValue: string): Promise<SelectOption[]> => {
    if (!inputValue) return []; // ✅ Always return a resolved Promise
    const encodedParam = encodeURIComponent(inputValue)
    
    try {
      const response = await fetch(
        `/api/location?q=${encodedParam}`,
        // `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&limit=5`,
      );
      
      const data: HereGeocodeResponse = await response.json();
      
      return data.items ? data.items.map((location) => ({
        value: JSON.stringify(location), // ✅ Store full OSM object as a JSON string
        label: location.title,
      })) : [];
    } catch (error) {
      console.error("Error fetching location data:", error);
      return [];
    }
  };

  const debouncedFetchLocationResults = useMemo(
    () =>
      debounce((inputValue, callback) => {
        fetchLocationResults(inputValue).then((options) => {
          setCachedOptions(options); // ✅ Save the last fetched results
          callback(options);
        });
      }, 500), // ✅ Debounce is only created once
    []
  );

  type LoadOptionsCallback = (options: Array<{ value: string; label: string }>) => void;
  
  const loadOptions = useCallback(
    (inputValue:string, callback: LoadOptionsCallback) => {
      debouncedFetchLocationResults(inputValue, callback);
    },
    [debouncedFetchLocationResults] // ✅ Now ESLint is happy
  );
  
  // const loadOptions = useCallback(
  //   debounce((inputValue, callback) => {
  //     fetchLocationResults(inputValue).then(callback);
  //   }, 500), // Adjust debounce delay as needed (500ms)
  //   []
  // );

  const handleSelectLocation = (location: HereGeocodeResult) => {
    // Set the selected location data into lat/lng fields
    console.log("location",location)
    const position = location.access && location.access[0] ? location.access[0] : location.position
    setValue(`${name}.name`, location.title); // Set location name
    setValue(`${name}.lat`, position.lat); // Set latitude
    setValue(`${name}.lng`, position.lng); // Set longitude
    setmapCentre(position)
  };

  const handleMapChange = (newLocation: latlng) => {
    setValue(`${name}.lat`, newLocation.lat); // Set latitude
    setValue(`${name}.lng`, newLocation.lng); // Set longitude
  }

  const customSelectStyles: StylesConfig<SelectOption, false> = {
    menu: (provided) => ({
      ...provided,
      zIndex: 1001, // Ensure it's above the map
    }),
  };
    
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-xl">{label}</h3>

      {/* Location Name */}
      <CustomComponent
        label="Venue Name"
        name={`${name}.name`}
        fieldSchema={fieldSchema}
        error={error}
      >
        { isClient ? <AsyncSelect
          loadOptions={loadOptions}
          isClearable
          placeholder="Enter location name"
          styles={customSelectStyles} 
          defaultOptions={cachedOptions}
          onChange={(selectedOption: SingleValue<SelectOption>) => {
            console.log("changed",selectedOption)
            if (selectedOption) {
              const selectedLocation: HereGeocodeResult = JSON.parse(selectedOption.value);
              handleSelectLocation(selectedLocation);
            } else {
              handleSelectLocation({title: "", position: { lat: 0.0, lng: 0.0 }} as unknown as HereGeocodeResult)
            }

          }}
        /> : <div>Loading</div> }

      </CustomComponent>

      { MapComponent ? <MapComponent lat={mapCentre.lat} lng={mapCentre.lng} onChange={handleMapChange} /> : null }

      {/* Latitude */}
      <CustomComponent
        label="Latitude" name={`${name}.lat`} fieldSchema={fieldSchema}
        error={error}
      >
        <input
          {...register(`${name}.lat`, { valueAsNumber: true })} // Use valueAsNumber for proper numeric input handling
          className="border p-2 rounded-md"
          placeholder="Enter latitude"
        />
      </CustomComponent>

      {/* Longitude */}
      <CustomComponent
        label="Longitude" name={`${name}.lng`}
        fieldSchema={fieldSchema}
        error={error}
      >
        <input
          {...register(`${name}.lng`, { valueAsNumber: true })}
          className="border p-2 rounded-md"
          placeholder="Enter longitude"
        />
      </CustomComponent>

      {/* Error Handling (optional) */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default LocationPicker;
