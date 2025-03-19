'use client'
import React from "react";
import { CustomComponentProps } from "../../types/form"

const CustomComponent: React.FC<CustomComponentProps> = ({ label, htmlFor, error, fieldSchema, children }) => {
  const description = fieldSchema._def.description ?? "";
  // const typeName = fieldSchema._def.typeName; // For debugging

  return (
    <div className="flex flex-col">
      <label className="font-semibold capitalize mb-2"  {...(htmlFor ? {htmlFor}:{})}>
        {label} <span className="text-gray-400 text-xs">{/*({typeName})*/}</span>
      </label>
      {children}
      {error ? <p className="text-red-600 text-sm">{error}</p> : description && <p className="text-gray-500 dark:text-gray-200 text-sm">{description}</p>}
    </div>
  );
};

export default CustomComponent;
