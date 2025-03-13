'use client'
import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface TextInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, register, validate, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <input {...register(name)} type="text" placeholder={fieldSchema._def.placeholder ?? ""} onBlur={validate} className="border p-2 rounded-md border-gray-300" />
  </CustomComponent>
);

export default TextInput;
