'use client'
import React from "react";
import { HiddenInputProps } from "../../types/form"

const TextInput: React.FC<HiddenInputProps> = ({ name, register }) => (
  <input {...register(name)} type="hidden" />
);

export default TextInput;
