'use client'
import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface NumberInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  validate: () => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, name, register, validate, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
    <input
      {...register(name, {
        setValueAs: (value) => (value === '' ? undefined : parseInt(value)),
      })}
      type="number"
      placeholder={fieldSchema._def.placeholder ?? ""}
      min={fieldSchema._def.minValue ?? undefined}
      max={fieldSchema._def.maxValue ?? undefined}
      onBlur={validate}
      className="border p-2 rounded-md border-gray-300"
    />
  </CustomComponent>
);

export default NumberInput;
