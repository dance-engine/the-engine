'use client'
import React, { useEffect, useRef } from "react";
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
import { DynamicFormProps } from '@dance-engine/ui/types' 
import { ZodObject, ZodRawShape } from "zod";
import Debug from '@dance-engine/ui/utils/Debug'

const DynamicForm: React.FC<DynamicFormProps<ZodObject<ZodRawShape>>> = ({ schema, metadata, onSubmit, MapComponent, data, persistKey, orgSlug}) => {
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FieldValues>({ 
    defaultValues: data,
    resolver: zodResolver(schema) 
  });

  const presignedUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/generate-presigned-url`.replace('/{org}',`/${orgSlug}`)

  useEffect(() => {
    reset(data)
  },[data,reset])
  
  const fields = Object.keys(schema.shape);
  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit((data) => {
        onSubmit(data)
        console.log("submitted",data)
        setValue("meta.saved", "saving") 
        setValue("meta.updated_at", new Date().toISOString())
      })} 
      className="space-y-4 w-full">
      <Debug debug={watchedValues} className="absolute right-10 "/>
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


        return (
          <div key={field} className="flex flex-col">
            { isHidden ? (
              <HiddenInput name={field} register={register} />
            ) : dateField ? (
              <DateInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
            ) : richText ? (
              <Controller
                control={control}
                name="description"
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
            ) : fieldType === "ZodObject" ? (
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

      <button type="submit" onClick={(e)=>{console.log("Clieck",e)}} className="bg-cerise-on-light text-white py-2 px-4 rounded-md">
        Save
      </button>
    </form>
  );
};

export default DynamicForm;
