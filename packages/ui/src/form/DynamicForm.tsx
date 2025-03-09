"use client";

import { z, ZodObject, ZodRawShape } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";


// ✅ Updated imports to reflect the new `form` folder structure
import { CustomTextInput, CustomSelect, CustomCheckbox } from "@dance-engine/ui/form/CustomInputs";
import MapSelector from "@dance-engine/ui/form/MapSelector";
import VenueSearch from "@dance-engine/ui/form/VenueSearch";

interface DynamicFormProps {
  schema: ZodObject<any>;
  storageKey: string;
  initialLocation: { lat: number; lng: number };
}

export default function DynamicForm({ schema, storageKey, initialLocation }: DynamicFormProps) {
  const [mapCenter, setMapCenter] = useState(initialLocation);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // ✅ Load default values from schema & LocalStorage
  const loadDefaultValues = () => {
    const schemaDefaults = schema.safeParse({}).success ? schema.parse({}) : {};

    let storedData = {};
    if (typeof window !== "undefined") {
      const storedDataRaw = localStorage.getItem(storageKey);
      if (storedDataRaw) {
        try {
          storedData = JSON.parse(storedDataRaw);
        } catch (error) {
          console.error("Error parsing stored data:", error);
        }
      }
    }

    const { latitude, longitude, ...filteredSchemaDefaults } = schemaDefaults;
    return { ...filteredSchemaDefaults, ...storedData };
  };

  const defaultValues = loadDefaultValues();

  const formFields = Object.entries(schema.shape as z.ZodRawShape).map(([name, schemaDefinition]) => {
    let fieldType = "text";

    if (schemaDefinition instanceof z.ZodNumber) {
      fieldType = name.includes("latitude") || name.includes("longitude") ? "map" : "number";
    } else if (schemaDefinition instanceof z.ZodBoolean) {
      fieldType = "checkbox";
    } else if (schemaDefinition instanceof z.ZodEnum) {
      fieldType = "select";
    }

    return {
      name,
      label: schemaDefinition.description || name,
      type: fieldType,
      options: schemaDefinition instanceof z.ZodEnum ? schemaDefinition._def.values : undefined,
    };
  });

  const { 
    register, 
    handleSubmit, 
    setValue,
    getValues,
    formState: { errors, isDirty, touchedFields, dirtyFields }, 
    reset 
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    if (isDirty) {
      setIsAutoSaving(true);
      localStorage.setItem(storageKey, JSON.stringify(getValues()));
      setTimeout(() => {
        setIsAutoSaving(false);
      }, 500);
    }
  }, [getValues, isDirty, storageKey]);

  const onVenueSelect = (location: { lat: number; lng: number; name: string }) => {
    setValue("latitude", location.lat);
    setValue("longitude", location.lng);
    setValue("venueName", location.name);
    setMapCenter({ lat: location.lat, lng: location.lng });
  };

  return (
    <form onSubmit={handleSubmit((data) => console.log("Event Created:", data))}>
      {formFields.map((field) => {
        const showError = errors[field.name] && (touchedFields[field.name] || dirtyFields[field.name]);

        return (
          <div key={field.name}>
            {field.name === "latitude" || field.name === "longitude" ? null : field.name === "venueName" ? (
              <>
                {/* <VenueSearch onSelect={onVenueSelect} mapCenter={mapCenter} /> */}
                {/* <MapSelector
                  mapCenter={{lat: getValues("latitude") ?? mapCenter.lat, lng: getValues("longitude") ?? mapCenter.lng}}
                  onSelect={setMapCenter}
                /> */}

              </>
            ) : field.type === "text" || field.type === "email" || field.type === "number" ? (
              <CustomTextInput 
                label={field.label} 
                name={field.name} 
                type={field.type} 
                register={register} 
                error={showError ? errors[field.name]?.message : ""}
              />
            ) : field.type === "checkbox" ? (
              <CustomCheckbox 
                label={field.label} 
                name={field.name} 
                register={register} 
                error={showError ? errors[field.name]?.message : ""}
              />
            ) : field.type === "select" ? (
              <CustomSelect 
                label={field.label} 
                name={field.name} 
                options={field.options} 
                register={register} 
                error={showError ? errors[field.name]?.message : ""}
              />
            ) : null}
          </div>
        );
      })}

      <button type="submit">Create Event</button>

      {isAutoSaving && <p>Auto-saving...</p>}
    </form>
  );
}
