'use client'
import React from "react";
import { TextInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";

const TextInput: React.FC<TextInputProps> = ({ label, name, register, validate, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <input {...register(name)} type="text" placeholder={fieldSchema._def.placeholder ?? ""} onBlur={validate} className="border p-2 rounded-md border-gray-300" />
  </CustomComponent>
);

export default TextInput;
