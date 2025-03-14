'use client'
import React from "react";
import { SelectProps } from "../../types/form"
import CustomComponent from "./CustomComponent";



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
