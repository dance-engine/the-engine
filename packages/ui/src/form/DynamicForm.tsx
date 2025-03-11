import React from "react";
import { useForm, FieldValues, Controller} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodObject, ZodRawShape } from "zod";
import getInnerSchema from '@dance-engine/utils/getInnerSchema'

import TextInput from "./fields/TextInput";
import Textarea from "./fields/Textarea";
import RichTextEditor from './fields/RichTextEditor';
import NumberInput from "./fields/NumberInput";
import DateInput from "./fields/DateInput";
import Select from "./fields/Select";
import CheckboxGroup from "./fields/CheckBoxes";

// 🔹 Extracts the actual field type, handling `ZodDefault`
// const getInnerSchema = (schema: ZodTypeAny) => (schema instanceof ZodDefault ? schema._def.innerType : schema);

interface DynamicFormProps {
  schema: ZodObject<ZodRawShape>;
  metadata?: Record<string, { multiline?: boolean, richText?: boolean, dateField?: boolean, checkboxesField: boolean }>;
  onSubmit: (data: FieldValues) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, metadata, onSubmit }) => {
  const {
    register,
    control,
    handleSubmit,
    trigger,
    // watch,
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
              <div>Unknown field {field}{fieldType}</div>
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
