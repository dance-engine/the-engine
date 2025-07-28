'use client'
import React from "react";
import { OnceOnlyInputProps } from "../../types/form"
import CustomComponent from "./CustomComponent";
import { labelFromSnake } from '@dance-engine/utils/textHelpers'


const OnceOnly: React.FC<OnceOnlyInputProps> = ({ label, name, currentValue, isDirty, register, validate, error, fieldSchema }) => (
  <div>
    
  {currentValue && ! isDirty ? 
    <div className="text-sm leading-none">
      <span className="text-gray-400 capitalize text-sm mr-2">{labelFromSnake(name)}: </span>
      <span className="font-medium text-gray-500">{currentValue}</span>
    </div>
  : <CustomComponent label={label} name={name} htmlFor={name} error={error} fieldSchema={fieldSchema}>
      <input {...register(name)} type="text" name={name} id={name} placeholder={fieldSchema._def.placeholder ?? ""} 
        onBlur={validate} className="border p-2 rounded-md border-red-300" />
    </CustomComponent>}
  </div>
  
);

export default OnceOnly;
