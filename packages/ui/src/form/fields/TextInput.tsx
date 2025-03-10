import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface TextInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, register, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} register={register} error={error} fieldSchema={fieldSchema}>
    <input {...register(name)} type="text" placeholder={fieldSchema._def.placeholder ?? ""} className="border p-2 rounded-md" />
  </CustomComponent>
);

export default TextInput;
