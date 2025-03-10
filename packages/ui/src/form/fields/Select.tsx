'use client'
import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface SelectProps {
  label: string;
  name: string;
  options: string[];
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const Select: React.FC<SelectProps> = ({ label, name, register, validate, error, fieldSchema, options }: SelectProps) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <select {...register(name)} onBlur={validate} className="border p-2 rounded-md">
      <option key={"option-none"} value="">--</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </CustomComponent>
);

export default Select;
