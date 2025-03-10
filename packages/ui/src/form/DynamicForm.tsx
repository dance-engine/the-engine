import React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodObject, ZodRawShape, ZodTypeAny, ZodDefault } from "zod";
import TextInput from "./fields/TextInput";
import Textarea from "./fields/Textarea";
import NumberInput from "./fields/NumberInput";
import DateInput from "./fields/DateInput";
import Select from "./fields/Select";

// 🔹 Extracts the actual field type, handling `ZodDefault`
const getInnerSchema = (schema: ZodTypeAny) => (schema instanceof ZodDefault ? schema._def.innerType : schema);

interface DynamicFormProps {
  schema: ZodObject<ZodRawShape>;
  metadata?: Record<string, { multiline?: boolean }>;
  onSubmit: (data: FieldValues) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, metadata, onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({ resolver: zodResolver(schema) });

  const fields = Object.keys(schema.shape);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white shadow-md rounded-md w-full">
      {fields.map((field) => {
        const rawSchema = schema.shape[field];
        if (!rawSchema) return null;

        const fieldSchema = getInnerSchema(rawSchema);
        const fieldType = fieldSchema._def.typeName;
        const isMultiline = metadata && metadata[field]?.multiline; // Get metadata for the field

        return (
          <div key={field} className="flex flex-col">
            {fieldType === "ZodString" && !fieldSchema._def.enum ? (
              isMultiline ? (
                <Textarea label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
              ) : (
                <TextInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
              )
            ) : fieldType === "ZodNumber" ? (
              <NumberInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
            ) : fieldType === "ZodEnum" ? (
              <Select label={field} name={field} options={Object.values(fieldSchema._def.values)} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
            ) : field === "date" ? (
              <DateInput label={field} name={field} register={register} error={errors[field]?.message as string} fieldSchema={fieldSchema} />
            ) : null}
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
