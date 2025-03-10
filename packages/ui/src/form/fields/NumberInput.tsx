import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { ZodTypeAny } from "zod";
import CustomComponent from "./CustomComponent";

interface NumberInputProps {
  label: string;
  name: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, name, register, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} register={register} error={error} fieldSchema={fieldSchema}>
    <input
      {...register(name, { valueAsNumber: true })}
      type="number"
      placeholder={fieldSchema._def.placeholder ?? ""}
      min={fieldSchema._def.minValue ?? undefined}
      max={fieldSchema._def.maxValue ?? undefined}
      className="border p-2 rounded-md"
    />
  </CustomComponent>
);

export default NumberInput;
