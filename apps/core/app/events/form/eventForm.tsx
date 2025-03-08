"use client"; // ✅ Ensures this runs in the browser (Client Component)

import { CustomTextInput, CustomSelect, CustomCheckbox } from "@dance-engine/ui/CustomInputs";
import MapSelector from "@dance-engine/ui/MapSelector";
import VenueSearch from "@dance-engine/ui/VenueSearch";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "eventSetupData";

export default function DynamicForm({ schema, storageKey = LOCAL_STORAGE_KEY }) {
  // ✅ Fix for Zod parsing error
  const defaultValues = schema.safeParse({}).success ? schema.parse({}) : {};

  const formFields = Object.entries(schema.shape).map(([name, schema]) => {
    let fieldType = "text";

    if (schema instanceof z.ZodNumber) {
      fieldType = name.includes("latitude") || name.includes("longitude") ? "map" : "number";
    } else if (schema instanceof z.ZodBoolean) {
      fieldType = "checkbox";
    } else if (schema instanceof z.ZodEnum) {
      fieldType = "select";
    }

    return {
      name,
      label: schema.description || name,
      type: fieldType,
      options: schema instanceof z.ZodEnum ? schema._def.values : undefined,
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

  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      reset(JSON.parse(storedData)); // ✅ Load saved data
    } else {
      reset(defaultValues); // ✅ Use schema defaults & support optional values
    }
  }, [reset, storageKey]);

  useEffect(() => {
    if (isDirty) {
      localStorage.setItem(storageKey, JSON.stringify(getValues()));
    }
  }, [getValues, isDirty, storageKey]);

  const onVenueSelect = ({ lat, lng, name }) => {
    setValue("latitude", lat);
    setValue("longitude", lng);
    setValue("venueName", name);
  };

  return (
    <form onSubmit={handleSubmit((data) => console.log("Event Created:", data))}>
      {formFields.map((field) => {
        const showError = errors[field.name] && (touchedFields[field.name] || dirtyFields[field.name]);

        return (
          <div key={field.name}>
            {field.name === "latitude" || field.name === "longitude" ? null : field.name === "venueName" ? (
              <>
                <VenueSearch onSelect={onVenueSelect} />
                <MapSelector
                  latitude={getValues("latitude")}
                  longitude={getValues("longitude")}
                  venueName={getValues("venueName")}
                  onLocationSelect={onVenueSelect}
                />
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