---
id: generate-model-info
title: generate-model-info
sidebar_label: generate-model-info
description: How to generate and OpenAPI spec and associated Pydantic Model
---

Make sure your in a venv with dependancies (check by calling `datamodel-codegen`).

One command to rule them all:
```bash
pnpm update-schema
```
A breakdown of what this command does is below.

:::warning[Warning for Models]
Make sure that you add models to the `serverless.models.yml` in the root of the functions directory. 
You may get an error that you cannot reference something that is null if you have not included the reference to the models defined in the `sls.{function}.models.yml` file in the main serverless yaml.
:::

---
# Process breakdown

1. Changes to Serverless config
2. Generate openAPI schema
3. Generate pydantic models
4. Update API reference (docusaurus)

### Changes to serverless config
Any changes to `{fucntion}/sls.{function}.doc.yml`, `{functions}/sls.{function}.models.yml`, `serverless.models.yml`, or `serverless.doc.yml` will require an update to the schemas.
Some other changes may also require it to be updated such as something in the function definition of a lambda that relates to adding endpoints, but this would also have to be linked to an update of the docs. 

### Generate opanAPI schema
Inside of the `the-engine/functions` directory run the command:

```bash
serverless openapi generate -o openapi.json
``` 

### Generate pydantic models
In the same directory as before. 
Make sure you have setup the python virtual environment and that you have activated it. 
Run the datamodel-codegen to generate the pydantic models:
```bash
datamodel-codegen --input openapi.json --input-file-type openapi --output ./ --snake-case-field --field-constraints --reuse-model --split-by-group --collapse-root-models --class-name pydantic.RootModel --target-python-version 3.11 --output-model-type=pydantic_v2.BaseModel
```

### Update API reference
Inside of the `the-engine/apps/apidocs` directory run this command:
```bash
docusaurus clean-api-docs core && docusaurus gen-api-docs all
```

