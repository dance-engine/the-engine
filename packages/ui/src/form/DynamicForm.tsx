import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodObject, ZodRawShape  } from "zod";

import TextInput from "./fields/TextInput";
import Textarea from "./fields/Textarea";
import NumberInput from "./fields/NumberInput";
import DateInput from "./fields/DateInput";
import Select from "./fields/Select";

interface DynamicFormProps {
  schema: ZodObject<ZodRawShape>;
  onSubmit: (data: any) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const fields = Object.keys(schema.shape);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white shadow-md rounded-md">
      {fields.map((field) => {
        const fieldSchema = schema.shape[field] ?? null;
        if (!fieldSchema) return null;
        const fieldType = fieldSchema._def.typeName ;
        const description = fieldSchema._def.description; // Get description if available

        return (
          <div key={field} className="flex flex-col">
            {/* Render field label and description */}
            <label className="font-semibold capitalize">{field}</label>
            {description && <p className="text-gray-500 text-sm">{description}</p>}

            {/* Render appropriate component based on field type */}
            {fieldType === "ZodString" && !fieldSchema._def.enum ? (
              field === "description" ? (
                <Textarea label={field} name={field} register={register} error={errors[field]?.message as string} />
              ) : (
                <TextInput label={field} name={field} register={register} error={errors[field]?.message as string} />
              )
            ) : fieldType === "ZodNumber" ? (
              <NumberInput label={field} name={field} register={register} error={errors[field]?.message as string} />
            ) : fieldType === "ZodEnum" ? (
              <Select label={field} name={field} options={Object.values(fieldSchema._def.values)} register={register} error={errors[field]?.message as string} />
            ) : field === "date" ? (
              <DateInput label={field} name={field} register={register} error={errors[field]?.message as string} />
            ) : null}
          </div>
        );
      })}

      <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded-md">
        Submit
      </button>
    </form>
  );
};

export default DynamicForm;
