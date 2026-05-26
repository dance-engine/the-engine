'use client'
import React from "react";
import { SelectProps } from "../../types/form"
import CustomComponent from "./CustomComponent";



const Select: React.FC<SelectProps> = ({ label, name, register, validate, error, fieldSchema, options }: SelectProps) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <select {...register(name)} onBlur={validate} className="border p-2 rounded-md" aria-label={name}>
      <option key={"option-none"} value="">--</option>
      {options.map((option) => {
        const value = typeof option === "string" ? option : option.value;
        const display = typeof option === "string" ? option : option.label;
        return (
          <option key={value} value={value}>
            {display}
          </option>
        );
      })}
    </select>
  </CustomComponent>
);

export default Select;
