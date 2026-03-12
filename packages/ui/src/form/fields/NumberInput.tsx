'use client'
import React from "react";
import { NumberInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";


const NumberInput: React.FC<NumberInputProps> = ({ label, name, register, validate, error, fieldSchema, currency }) => (
  <CustomComponent label={label} name={name} htmlFor={name} error={error} fieldSchema={fieldSchema}>
    {currency ? (
      <div className="relative">
        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold pointer-events-none">
          £
        </span>
        <input
          {...register(name, {
            setValueAs: (value) => {
              if (value === '') return undefined;
              const num = parseFloat(value);
              return Math.round(num * 100); // Convert pounds to pence
            },
            onBlur: (e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                e.target.value = value.toFixed(2);
              }
              validate();
            },
          })}
          type="number"
          inputMode="numeric"
          id={name}
          placeholder={fieldSchema._def.placeholder ?? "0.00"}
          min={fieldSchema._def.minValue ?? undefined}
          max={fieldSchema._def.maxValue ?? undefined}
          step="0.01"
          className="border p-2 pl-6 rounded-md border-gray-300 w-full"
        />
      </div>
    ) : (
      <input
        {...register(name, {
          setValueAs: (value) => (value === '' ? undefined : parseInt(value)),
        })}
        type="number"
        inputMode="numeric"
        id={name}
        placeholder={fieldSchema._def.placeholder ?? ""}
        min={fieldSchema._def.minValue ?? undefined}
        max={fieldSchema._def.maxValue ?? undefined}
        onBlur={validate}
        className="border p-2 rounded-md border-gray-300"
      />
    )}
  </CustomComponent>
);

export default NumberInput;
