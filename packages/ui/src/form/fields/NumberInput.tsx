'use client'
import React from "react";
import { NumberInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";


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
