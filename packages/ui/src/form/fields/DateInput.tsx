import React from "react";
import { DateInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";

const DateInput: React.FC<DateInputProps> = ({ label, name, register, error, fieldSchema }) => {
  return (
    <CustomComponent label={label} name={name} htmlFor={name} error={error} fieldSchema={fieldSchema}>
      <input {...register(name)} 
        type="datetime-local" 
        id={name} 
        className="border p-2 rounded-md border-gray-300" />
      {error}
    </CustomComponent>
  );
};

export default DateInput;
