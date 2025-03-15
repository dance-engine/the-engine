'use client'
import React from "react";

import getInnerSchema from '@dance-engine/utils/getInnerSchema'
import CustomComponent from "./CustomComponent";
import { CheckboxGroupProps } from '../../types/form'

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
      <div className="space-y-2 grid grid-cols-1 md:flex flex-wrap gap-6 items-start">
        {options && options.map((option: string, index: number) => (
          <label key={index} className="flex items-center gap-2 capitalize leading-none">
            {/* <input
              {...register(name)} // Register the checkbox group with React Hook Form
              type="checkbox"
              value={option}
              className="mr-2"
            /> */}
            <div className="group grid size-4 grid-cols-1">
              <input
                {...register(name)} // Register the checkbox group with React Hook Form
                type="checkbox"
                value={option}
                aria-describedby="comments-description"
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
              />
              {/* This is the tick */}
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
              >
                <path
                  d="M3 8L6 11L11 3.5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 group-has-checked:opacity-100"
                />
                <path
                  d="M3 7H11"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 group-has-indeterminate:opacity-100"
                />
              </svg>
              </div>
              {option}
          </label>
        ))}
      </div>
    </CustomComponent>
  );
};

export default CheckboxGroup;


