'use client'
import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import { labelFromSnake } from '@dance-engine/utils/textHelpers'

type CheckboxProps = {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
};

// Single on/off field for ZodBoolean schemas. Unchecked submits false.
const Checkbox: React.FC<CheckboxProps> = ({ label, name, register, error, fieldSchema }) => {
  const description = fieldSchema._def.description ?? "";

  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="flex items-center gap-2 font-semibold">
        <input
          {...register(name)}
          id={name}
          type="checkbox"
          className="size-4 rounded-sm border-gray-300 accent-dark-highlight"
        />
        {labelFromSnake(label)}
      </label>
      {error ? <p className="text-red-600 text-sm">{error}</p> : description && <p className="text-gray-500 dark:text-gray-200 text-sm">{description}</p>}
    </div>
  );
};

export default Checkbox;
