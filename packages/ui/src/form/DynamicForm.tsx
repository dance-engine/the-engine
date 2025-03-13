'use client'
import React from "react";
import { useForm, FieldValues, Controller, FieldError, FieldErrorsImpl} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodObject, ZodRawShape } from "zod";
import getInnerSchema from '@dance-engine/utils/getInnerSchema'

import TextInput from "@dance-engine/ui/form/fields/TextInput";
import Textarea from "@dance-engine/ui/form/fields/Textarea";
import RichTextEditor from '@dance-engine/ui/form/fields/RichTextEditor';
import NumberInput from "@dance-engine/ui/form/fields/NumberInput";
import DateInput from "@dance-engine/ui/form/fields/DateInput";
import Select from "@dance-engine/ui/form/fields/Select";
import CheckboxGroup from "@dance-engine/ui/form/fields/CheckBoxes";
import LocationPicker from "@dance-engine/ui/form/fields/LocationPicker"

import { MapPickerProps } from '@dance-engine/ui/form/fields/MapPicker'

interface DynamicFormProps {
  schema: ZodObject<ZodRawShape>;
  metadata?: Record<string, { multiline?: boolean, richText?: boolean, dateField?: boolean, checkboxesField?: boolean }>;
  onSubmit: (data: FieldValues) => void;
  MapComponent?: React.FC<MapPickerProps>
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, metadata, onSubmit, MapComponent}) => {
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({ resolver: zodResolver(schema) });
  
  const fields = Object.keys(schema.shape);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      {/* <div>{JSON.stringify(watch(),null,2)}</div> */}
      {fields.map((field) => {
        const rawSchema = schema.shape[field];
        if (!rawSchema) return null;

        const fieldSchema = getInnerSchema(rawSchema);
        const fieldType = fieldSchema._def.typeName;
        const isMultiline = metadata && metadata[field]?.multiline; // Get metadata for the field
        const richText = metadata && metadata[field]?.richText; // Get metadata for the field
        const dateField = metadata && metadata[field]?.dateField; // Get metadata for the field
        const checkboxesField = metadata && metadata[field]?.checkboxesField; // Get metadata for the field
        return (
          <div key={field} className="flex flex-col">
            { dateField ? (
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
            ) : checkboxesField ? (
              <CheckboxGroup
                label={field} name={field}            
                register={register}
                fieldSchema={fieldSchema} // Pass the ZodEnum schema for roles
                error={errors[field]?.message as string} // Display error message for roles
              />
            ) : fieldType === "ZodObject" ? (
              <div>Errors 
                {/* {JSON.stringify((errors[field] as unknown as {name: {message:string}})?.name?.message )} */}
              <LocationPicker label={field} control={control} name={field} fieldSchema={fieldSchema} MapComponent={MapComponent}
              register={register} setValue={setValue} validate={() => {trigger(field)}}
              error={{
                name: (errors[field] as unknown as {name: {message:string}})?.name?.message, 
                lat:(errors[field] as unknown as {lat: {message:string}})?.lat?.message, 
                lng: (errors[field] as unknown as {lng: {message:string}})?.lng?.message }}
              // error={
              //   errors[field] ? {name: errors[field]['name'].message as string, lat: errors[field]['lat'].message,lng: errors[field]['lng'].message } 
              //   : {name:"", lat:"", lng:""} 
              />
              
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
              <div>Unknown field {field} : {fieldType}</div>
            )}
          </div>
        );
      })}

      <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded-md">
        Submit
      </button>
    </form>
  );
};

export default DynamicForm;
