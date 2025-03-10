import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface TextareaProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const Textarea: React.FC<TextareaProps> = ({ label, name, register, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} register={register} error={error} fieldSchema={fieldSchema}>
    <textarea
      {...register(name)}
      placeholder={fieldSchema._def.placeholder ?? ""}
      className="border p-2 rounded-md h-24"
    />
  </CustomComponent>
);

export default Textarea;
