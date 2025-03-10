import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface SelectProps {
  label: string;
  name: string;
  options: string[];
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const Select: React.FC<SelectProps> = ({ label, name, register, error, fieldSchema, options }) => (
  <CustomComponent label={label} name={name} register={register} error={error} fieldSchema={fieldSchema}>
    <select {...register(name)} className="border p-2 rounded-md">
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </CustomComponent>
);

export default Select;
