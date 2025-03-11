'use client'
import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import getInnerSchema from '@dance-engine/utils/getInnerSchema'
import CustomComponent from "./CustomComponent";

interface CheckboxGroupProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate?: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  name,
  register,
  error,
  fieldSchema,
}: CheckboxGroupProps) => {
  const options = getInnerSchema(fieldSchema)._def.values; // Assuming your enum has a `_def.values` array for the options

  return (
    <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
      <div className="space-y-2">
        {options && options.map((option: string, index: number) => (
          <label key={index} className="flex items-center">
            <input
              {...register(name)} // Register the checkbox group with React Hook Form
              type="checkbox"
              value={option}
              className="mr-2"
            />
            {option}
          </label>
        ))}
      </div>
    </CustomComponent>
  );
};

export default CheckboxGroup;
