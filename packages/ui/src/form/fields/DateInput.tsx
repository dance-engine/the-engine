import React from "react";
import { DateInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";



const DateInput: React.FC<DateInputProps> = ({ label, name, register, error, fieldSchema }) => (
  <CustomComponent label={label} name={name} htmlFor={name} error={error} fieldSchema={fieldSchema}>
    <input {...register(name)} type="datetime-local" id={name} className="border p-2 rounded-md" />
  </CustomComponent>
);

export default DateInput;
