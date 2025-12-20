'use client'
import React, { useEffect } from "react";
import { useForm, FieldValues, Controller,} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import getInnerSchema from '@dance-engine/utils/getInnerSchema'

import TextInput from "@dance-engine/ui/form/fields/TextInput";
import HiddenInput from "@dance-engine/ui/form/fields/HiddenInput"
import Textarea from "@dance-engine/ui/form/fields/Textarea";
import RichTextEditor from '@dance-engine/ui/form/fields/RichTextEditor';
import NumberInput from "@dance-engine/ui/form/fields/NumberInput";
import DateInput from "@dance-engine/ui/form/fields/DateInput";
import Select from "@dance-engine/ui/form/fields/Select";
import CheckboxGroup from "@dance-engine/ui/form/fields/CheckBoxes";
import LocationPicker from "@dance-engine/ui/form/fields/LocationPicker"
import FileUploader from "./fields/FileUploader";
import OnceOnly from "@dance-engine/ui/form/fields/OnceOnly";
import { DynamicFormProps } from '@dance-engine/ui/types' 
import { ZodObject, ZodRawShape } from "zod";
import Debug from '@dance-engine/ui/utils/Debug'
import { useLocalAutoSave } from '@dance-engine/utils/LocalAutosave'
import { labelFromSnake } from '@dance-engine/utils/textHelpers'
import { EntityType } from '@dance-engine/schemas'
import { format, parseISO } from "date-fns";

//! TODO Fix this to be generic not EVENT type

function transformDates(formObj: FieldValues): EntityType | FieldValues {
  // Add any date fields you want to transform
  const dateFields = ["starts_at", "ends_at"];  //TODO Should calculate these from metadata
  const newObj = { ...formObj };
  dateFields.forEach(field => {
    if (formObj[field]) {
      const date = parseISO(formObj[field]);
      newObj[field] = format(date, "yyyy-MM-dd'T'HH:mm");
    }
  });
  return newObj as EntityType;
}


const DynamicForm: React.FC<DynamicFormProps<ZodObject<ZodRawShape>>> = ({ schema, metadata, onSubmit, MapComponent, data, persistKey, orgSlug}) => {
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, dirtyFields},
  } = useForm<FieldValues>({ 
    defaultValues: data,
    resolver: zodResolver(schema) 
  });

  const presignedUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/generate-presigned-url`.replace('/{org}',`/${orgSlug}`)
  const watchedValues = watch();
  const { status: autosaveStatus, isStatusVisible: isAutosaveStatusVisible,  loadFromStorage } = useLocalAutoSave<EntityType>({
    data: watchedValues as EntityType,
    entityType: data?.entity_type || "UNKNOWN",
    remoteUpdatedAt: data?.updated_at,
    isDirty
  });

  useEffect(() => {
    const draft = loadFromStorage();
    console.log("Comparing versions \nlocal:",draft?.version,"\nremote:",data?.version, "[",(draft && draft.version && data && draft.version >= data.version),"]")
    if (!data || (draft && draft.version && data && draft.version >= data.version)) { 
      console.info("Loading Cached", "\nDraft", draft, "\nData", data)
      reset(transformDates(draft as FieldValues) as EntityType)
    } else { 
      console.info("Loading Remote", "\nDraft", draft, "\nData", data)
      reset(transformDates(data) as EntityType)
    }  
  }, [loadFromStorage, data, reset]);
  
  const fields = Object.keys(schema.shape);
  

  return (
    <form onSubmit={handleSubmit((data) => {
        onSubmit(data)
        setValue("meta.saved", "saving") 
        setValue("meta.updated_at", new Date().toISOString())
      })} 
      className="space-y-4 w-full relative">
      {/* {errors && <div className="text-red-500">{JSON.stringify(errors)}</div>} */}
      <Debug className="absolute right-0" debug={{ formState: isDirty ? "Dirty" : "Clean", values: watchedValues, errors: errors}} /> 
      {/* <div>Org: {orgSlug} {JSON.stringify(data,null,2)}</div> */}
      <div className={`fixed bg-gray-500 top-24 right-10 rounded-md transition-opacity duration-750 text-gray-50 px-3 py-1 ${isAutosaveStatusVisible ? "opacity-100" : "opacity-0"}`}>{autosaveStatus}</div>
      {/* <Debug debug={errors} className="absolute right-10 top-10"/> */}
      {fields.map((field) => {
        const rawSchema = schema.shape[field];
        if (!rawSchema) return null;

        const fieldSchema = getInnerSchema(rawSchema);
        const fieldType = fieldSchema._def.typeName;
        const isMultiline = metadata && metadata[field]?.multiline; // Get metadata for the field
        const richText = metadata && metadata[field]?.richText; // Get metadata for the field
        const dateField = metadata && metadata[field]?.dateField; // Get metadata for the field
        const checkboxesField = metadata && metadata[field]?.checkboxesField; // Get metadata for the field
        const isHidden = metadata && metadata[field]?.hidden
        const isSingleFileUpload = metadata && metadata[field]?.fileUploadField && metadata[field]?.fileUploadField == 'single'
        const isDisplayInfo = metadata && metadata[field]?.info
        const isOnceOnly = metadata && metadata[field]?.onceOnly; // Get metadata for the field

        return (
          <div key={field} className={`flex flex-col ${isDisplayInfo ? "mb-1" : null}`}>
            { isHidden ? (
              <HiddenInput name={field} register={register} />
            ) : dateField ? (
              <>
                {(new Date).toISOString() }
                {/* <TextInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema}  validate={() => {trigger(field)}} /> */}
                <DateInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
              </>
            ) : richText ? (
              <Controller
                control={control}
                name={field}
                defaultValue=""
                render={({ field: fieldController }) => (
                  <RichTextEditor label={field} name={field} value={fieldController.value} onChange={fieldController.onChange} error={errors[field]?.message as string} fieldSchema={fieldSchema}/>
                )}
              />
            ) : isMultiline ? (
              <Textarea label={field} name={field} fieldSchema={fieldSchema} 
                register={register} validate={() => {trigger(field)}}
                error={errors[field]?.message as string}
              />
            ) : isSingleFileUpload ? (
              <FileUploader label={field} name={field} fieldSchema={fieldSchema} watch={watch} uploadUrl={presignedUrlEndpoint}
                {...(persistKey ? { entity: persistKey } : {})}
                register={register} validate={() => {trigger(field)}} setValue={setValue}
                error={errors[field]?.message as string}
              />
            ) : checkboxesField ? (
              <CheckboxGroup
                label={field} name={field}            
                register={register}
                fieldSchema={fieldSchema} // Pass the ZodEnum schema for roles
                error={errors[field]?.message as string} // Display error message for roles
              />
            ) : isDisplayInfo ? (
              <div className="text-sm leading-none">
                <span className="text-gray-400 capitalize text-sm mr-2">{labelFromSnake(field)}: </span>
                <span className="font-medium text-gray-500">{watch(field)}</span>
              </div>
            ) : isOnceOnly ? (
              <OnceOnly label={field} name={field} 
                currentValue={watch(field)}
                isDirty={Object.keys(dirtyFields).includes(field)}
                register={register} validate={() => {trigger(field)}} 
                error={errors[field]?.message as string} fieldSchema={fieldSchema} 
                />
            ) : fieldType === "ZodObject" ? ( //TODO Don't assume all object are LocationPickers
              <div> 
                {/* {JSON.stringify((errors[field] as unknown as {name: {message:string}})?.name?.message )} */}
                {/* {JSON.stringify(getValues(field))} */}
                {typeof window !== "undefined" &&<LocationPicker label={field} control={control} name={field} fieldSchema={fieldSchema} MapComponent={MapComponent}
              register={register} setValue={setValue} validate={() => {trigger(field)}}
              error={{
                name: (errors[field] as unknown as {name: {message:string}})?.name?.message, 
                lat:(errors[field] as unknown as {lat: {message:string}})?.lat?.message, 
                lng: (errors[field] as unknown as {lng: {message:string}})?.lng?.message,
                address: (errors[field] as unknown as {address: {message:string}})?.address?.message 
              }}

              // error={
              //   errors[field] ? {name: errors[field]['name'].message as string, lat: errors[field]['lat'].message,lng: errors[field]['lng'].message } 
              //   : {name:"", lat:"", lng:""} 
              />}
              
              </div>
            ) : fieldType === "ZodNumber" ? (
              <NumberInput label={field} name={field} fieldSchema={fieldSchema}
              register={register} validate={() => {trigger(field)}}
              error={errors[field]?.message as string} />
            ) : fieldType === "ZodEnum" ? (
              <Select label={field} name={field} options={Object.values(fieldSchema._def.values)} fieldSchema={fieldSchema}
              register={register} validate={() => {trigger(field)}}
              error={errors[field]?.message as string}  />
            ) : fieldType === "ZodString" ?(
              <TextInput label={field} name={field} fieldSchema={fieldSchema}
              register={register} validate={() => {trigger(field)}}
              error={errors[field]?.message as string}  />
            ) : (
              <div className="hidden">Unknown field {field} : {fieldType}</div>
            )}
          </div>
        );
      })}

      <button type="submit" className="bg-cerise-on-light text-white py-2 px-4 rounded-md mt-3">
        Save
      </button>
    </form>
  );
};

export default DynamicForm;
