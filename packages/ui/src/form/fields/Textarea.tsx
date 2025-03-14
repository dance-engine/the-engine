'use client'
import React from "react";
import { TextareaProps } from "../../types/form"
import CustomComponent from "./CustomComponent";


const Textarea: React.FC<TextareaProps> = ({ label, name, register, validate, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <textarea
      {...register(name)}
      onBlur={validate}
      placeholder={fieldSchema._def.placeholder ?? ""}
      className="border p-2 rounded-md h-24"
    />
  </CustomComponent>
);

export default Textarea;
