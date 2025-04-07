import { UseFormRegister, FieldValues, UseFormSetValue, Control, UseFormWatch } from "react-hook-form";
import { ZodTypeAny, ZodObject, ZodRawShape, infer as ZodInfer } from "zod";
import { ReactNode } from "react";
import { LatLngLiteral } from 'leaflet'

export interface CustomComponentProps {
  label: string;
  name: string;
  htmlFor?: string;
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
  error?: {name:string, lat:string, lng:string, address:string };
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

// export interface DynamicFormProps {
//   schema: ZodObject<ZodRawShape>;
//   metadata?: MetaData;
//   onSubmit: (data: FieldValues) => void;
//   MapComponent?: React.FC<MapPickerProps>
//   initValues?: 
// }

export interface DynamicFormProps<T extends ZodObject<ZodRawShape>> {
  schema: T;
  metadata?: MetaData;
  onSubmit: (data: FieldValues) => void;
  MapComponent?: React.FC<MapPickerProps>; // Has to be a client component and load dynamically from nextjs
  data?: ZodInfer<T>; // 🔥 Extracts the correct type from schema
  persistKey?: DanceEngineEntity
  orgSlug?: string
}

export interface DynamicFieldOptions { 
  multiline?: boolean, 
  richText?: boolean, 
  dateField?: boolean, 
  checkboxesField?: boolean,
  hidden?: boolean,
  fileUploadField?: string;
  info?: boolean;
}

export type MetaData = {
  [key: string]: DynamicFieldOptions | MetaData;
}

export interface FileUploaderProps {
  label: string;
  name: string;
  entity?: DanceEngineEntity,
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  setValue: UseFormSetValue<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
  uploadUrl: string; // API endpoint for presigned post
}

export interface DanceEngineEntity {
  type: string,
  ksuid: string
}