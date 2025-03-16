'use client'
import { LocationPickerProps, SelectOption, LoadOptionsCallback } from "../../types/form"
import { HereGeocodeResult, HereGeocodeResponse, LatLng } from "../../types/heroGeocode"
import React, {useCallback, useState, useMemo, useEffect } from "react";
import AsyncSelect from "react-select/async";
import {SingleValue, StylesConfig } from 'react-select'
import CustomComponent from "./CustomComponent"; // Assuming CustomComponent is already defined
import debounce from 'debounce'; // Import debounce from the standalone library


const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  name,
  register,
  setValue,
  error,
  validate,
  fieldSchema,
  MapComponent
}) => {

  const [mapCentre,setmapCentre] = useState({lat: 53.40262, lng: -2.96981 } as LatLng)
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
        label: `${location.title}, ${location.address.street}`,
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
  
  const loadOptions = useCallback(
    (inputValue:string, callback: LoadOptionsCallback) => {
      debouncedFetchLocationResults(inputValue, callback);
    },
    [debouncedFetchLocationResults] // ✅ Now ESLint is happy
  );

  const handleSelectLocation = (location: HereGeocodeResult) => {
    // Set the selected location data into lat/lng fields
    console.log("location",location)
    const position = location.access && location.access[0] ? location.access[0] : location.position
    const address = location.address ? [`${[location.address.houseNumber,location.address.street].flat().join('-')}`, location.address.district,location.address.city,location.address.county,location.address.postalCode].join(', ') : false
    console.log(location.address)
    setValue(`${name}.name`, location.title); // Set location name
    setValue(`${name}.lat`, position.lat); // Set latitude
    setValue(`${name}.lng`, position.lng); // Set longitude
    if(address) { setValue('address',location.address.label) } //TODO This should have a sub fields thing sent in or address should be part of location
    if (validate){validate()}
    setmapCentre(position)
  };

  const handleMapChange = (newLocation: LatLng) => {
    setValue(`${name}.lat`, newLocation.lat); // Set latitude
    setValue(`${name}.lng`, newLocation.lng); // Set longitude
  }
  const styler = (provided: any) => ({
    ...provided,
    color: 'var(--foreground)',
  })
  const customSelectStyles: StylesConfig<SelectOption, false> = {
    control: (provided) => ({
      ...provided,
      color: 'var(--foreground)',
      backgroundColor: 'var(--background)'
    }),
    input: styler,
    placeholder: styler,
    valueContainer:styler,
    option: (provided,state) => (state.isFocused ? {  ...provided, color: 'white', backgroundColor: '#2684ff' } : {...provided}),
    menu: (provided) => ({
      ...provided,
      zIndex: 1001, // Ensure it's above the map
      color: 'var(--foreground)',
      backgroundColor: 'var(--background)'
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
        error={error.name}
      >
        {/* {JSON.stringify(error['name'])} */}
        { isClient ? <AsyncSelect
          loadOptions={loadOptions}
          isClearable
          placeholder="Enter location name"
          styles={customSelectStyles} 
          classNames={{
            menuList: () => "bg-green rounded-md border",
            menuPortal: ()=> "bg-green",
            control: () => "border rounded-md",
          }}
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
        /> : <div>Loading....</div> }

      </CustomComponent>

      { MapComponent ? (<MapComponent lat={mapCentre.lat} lng={mapCentre.lng} onChange={handleMapChange} />) : null }

      {/* Latitude */}
      {/* <CustomComponent
        label="Latitude" name={`${name}.lat`} fieldSchema={fieldSchema}
        error={error.lat}
      > */}
        <input
          type="hidden"
          {...register(`${name}.lat`, { valueAsNumber: true })} // Use valueAsNumber for proper numeric input handling
          className="border p-2 rounded-md"
          placeholder="Enter latitude"
        />
      {/* </CustomComponent> */}

      {/* Longitude */}
      {/* <CustomComponent
        label="Longitude" name={`${name}.lng`}
        fieldSchema={fieldSchema}
        error={error.lng}
      > */}
        <input
        type="hidden"
          {...register(`${name}.lng`, { valueAsNumber: true })}
          className="border p-2 rounded-md"
          placeholder="Enter longitude"
        />
      {/* </CustomComponent> */}

      {/* Error Handling (optional) */}
      {/* {error && <p className="text-red-500 text-sm">{error}</p>} */}
    </div>
  );
};

export default LocationPicker;
