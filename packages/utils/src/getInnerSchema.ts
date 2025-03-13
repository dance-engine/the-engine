import { ZodTypeAny, ZodOptional, ZodDefault, ZodEffects, ZodNullable, ZodArray } from "zod";

// Recursively unwrap the schema to get to the root type
const getInnerSchema = (schema: ZodTypeAny): ZodTypeAny => {
  if (schema instanceof ZodOptional) {
    return getInnerSchema(schema._def.innerType);  // Recurse if wrapped with ZodOptional
  } else if (schema instanceof ZodDefault) {
    return getInnerSchema(schema._def.innerType);  // Recurse if wrapped with ZodDefault
  } else if (schema instanceof ZodEffects) {
    return getInnerSchema(schema._def.schema);  // Recurse if wrapped with ZodEffect
  } else if (schema instanceof ZodNullable) {
    return getInnerSchema(schema._def.innerType);  // Recurse if wrapped with ZodNullable
  } else if (schema instanceof ZodArray ) {
    return getInnerSchema(schema._def.type);  // Recurse if wrapped with ZodNullable
  }

  return schema;  // Return the root type (base schema)
};

export default getInnerSchema;