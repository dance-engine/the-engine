import { UseFormRegister, FieldValues, UseFormSetValue, Control } from "react-hook-form";
import { ZodTypeAny, ZodObject, ZodRawShape } from "zod";
import { ReactNode } from "react";
import { LatLngLiteral } from 'leaflet'

export interface CustomComponentProps {
  label: string;
  name: string;
  error?: string;
  fieldSchema: ZodTypeAny;
  children: ReactNode;
}

export interface CheckboxGroupProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate?: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

export interface DateInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
}

// Map & Location

export interface LocationPickerProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate?: () => void;
  setValue: UseFormSetValue<FieldValues>;
  control: Control<FieldValues>;
  MapComponent?: React.FC<MapPickerProps>;
  error: {name:string, lat:string, lng:string};
  fieldSchema: ZodTypeAny; // This will be the location schema passed to each field
}

export interface SelectOption {
  label: string,
  value: string
}

export type LoadOptionsCallback = (options: Array<{ value: string; label: string }>) => void;

export interface MapPickerProps {
  lat: number, 
  lng: number, 
  onChange: (latlng: LatLngLiteral) => void
}

export interface NumberInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

// RichText
export interface RichTextEditorProps {
  label: string;
  name: string;
  value: string;
  onChange: (content: string) => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

export interface SelectProps {
  label: string;
  name: string;
  options: string[];
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

export interface TextareaProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate?: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
  
}

export interface TextInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

export interface HiddenInputProps {
  name: string;
  register: UseFormRegister<FieldValues>;
}

export interface DynamicFormProps {
  schema: ZodObject<ZodRawShape>;
  metadata?: MetaData;
  onSubmit: (data: FieldValues) => void;
  MapComponent?: React.FC<MapPickerProps>
}

export interface DynamicFieldOptions { 
  multiline?: boolean, 
  richText?: boolean, 
  dateField?: boolean, 
  checkboxesField?: boolean,
  hidden?: boolean
}

export type MetaData = {
  [key: string]: DynamicFieldOptions | MetaData;
}