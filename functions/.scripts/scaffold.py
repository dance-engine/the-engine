import typer
from pathlib import Path
import shutil
from typing import Optional,List
from typing_extensions import Annotated

app = typer.Typer()

BASE = Path.cwd()
SERVERLESS_YML = BASE / "serverless.yml"

def snake_to_pascal(s: str) -> str:
    return ''.join(word.capitalize() for word in s.split('_'))

@app.command()
def another_command():
    return

@app.command()
def create_lambda(
    name: Annotated[str, typer.Option(..., help="Name of the lambda")],
    trigger: Annotated[str, typer.Option("--trigger", "-t", help="Trigger type: http or eventbridge")] = "http",
    directory: Annotated[str, typer.Option("--directory", "-d", help="Target directoryfor this lambda")] = "functions"
):
    """
    Scaffold a new Lambda
    """

    # Create folder and base files
    target_dir = BASE / directory
    lambda_dir = target_dir / name
    lambda_dir.mkdir(parents=True, exist_ok=True)

    # Create method files (get_all.py, post.py, etc.)
    lambda_file = lambda_dir / f"lambda_{name}.py"
    if not lambda_file.exists():
        lambda_file.write_text(lambda_template(name, trigger))

    # Write function config
    function_config = lambda_dir / f"sls.{name}.function.yml"
    function_config.parent.mkdir(parents=True, exist_ok=True)
    function_config.write_text(function_yaml(name, lambda_dir, trigger))


    # Write doc config
    if trigger == "http":
        doc_config = lambda_dir / f"sls.{name}.doc.yml"
        doc_config.parent.mkdir(parents=True, exist_ok=True)
        doc_config.write_text(doc_yaml(name))


    # Write placeholder model config
    models_config = lambda_dir / f"sls.{name}.models.yml"
    models_config.parent.mkdir(parents=True, exist_ok=True)
    models_config.write_text(" ")

    # Append function include to serverless.yml
    append_to_serverless_yaml(name, lambda_dir)

    typer.echo(f"✅ Lambda '{name}' scaffolded in '{directory}/'")

@app.command()
def delete_lambda(
    name: Annotated[str, typer.Option(..., help="Name of the lambda to delete")],
    directory: Annotated[str, typer.Option("--directory", "-d", help="Dircetory where this lambda is located")] = "functions"
):
    """
    Delete an existing Lambda.
    """

    target_dir = BASE / directory
    lambda_dir = target_dir / name
    pascal_name = snake_to_pascal(name)

    if not lambda_dir.exists():
        typer.echo(f"❌ Lambda directory does not exist: {lambda_dir}")
        raise typer.Exit(code=1)

    typer.echo(f"⚠️  You are about to delete all files for lambda '{name}' in {lambda_dir}")
    confirm = typer.prompt("Are you absolutely sure you want to proceed? Type 'yes' to continue")
    if confirm.strip().lower() != "yes":
        typer.echo("❌ Aborted.")
        raise typer.Exit()

    confirm_name = typer.prompt(f"Type the EXACT lambda name to confirm deletion")
    if confirm_name.strip() != name:
        typer.echo("❌ Name mismatch. Aborting deletion.")
        raise typer.Exit()

    # Delete the directory
    try:
        shutil.rmtree(lambda_dir)
        typer.echo(f"🗑️  Deleted lambda folder: {lambda_dir}")
    except Exception as e:
        typer.echo(f"❌ Error deleting folder: {e}")
        raise typer.Exit(code=1)

    # Remove include line from serverless.yml
    remove_from_serverless_yaml(name, lambda_dir)
    typer.echo(f"✅ Lambda '{name}' fully removed.")

def lambda_template(name: str, trigger: str) -> str:
    if trigger == "eventbridge":
        return f"""## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.{name}_models import {name}Object, {name}Response
#from _pydantic.models.models_extended import {name}Model
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
#db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))

def lambda_handler(event, context):
    # TODO: implement
    return
    """
    return f"""## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.{name}_models import {name}Object, {name}Response
#from _pydantic.models.models_extended import {name}Model
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
#db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))

## write here the code which is called from the handler
def get(organisationSlug: str, public: bool = False, actor: str = "unknown") -> {name}Object:
    '''
    You expect me to return an instance of {name}Object.
    '''
    # TODO: implement
    return make_response(201, {{
            "message": "It's a work in progress...",
        }})

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {{}}).get("organisation")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {{}}).get("accountId", "unknown")

        # POST
        if http_method == "POST":
            return make_response(405, {{"message": "Method not implemented."}})
        # PUT 
        if http_method == "PUT":
            return make_response(405, {{"message": "Method not implemented."}})
        # GET 
        elif http_method == "GET":
            response_cls = {name}Response # The model response class defined in pydantic

            if not organisationSlug:
                return make_response(404, {{"message": "Missing organisation in request"}})            
            
            result = get(organisationSlug)
            response = response_cls({name}=result)
            return make_response(200, response.model_dump(mode="json", exclude_none=True))     

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{{"message": "Validation error.", "error": str(e)}})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {{"message": "Internal server error.", "error": str(e)}})
    """

def function_yaml(name: str, lambda_dir: Path, trigger: str) -> str:
    name_pascal = snake_to_pascal(name)

    if trigger == "http":
        route_events = []
        doc_path = (lambda_dir / f"sls.{name}.doc.yml").relative_to(BASE)
        routes = ["GET", "POST", "PUT"]
        for route in routes:
            route_events.append(f"""      - httpApi:
          path: /{{organisation}}/{name}
          method: {route.lower()}
          authorizer:
            adminAuthorizer
          documentation: ${{{{file({doc_path}):endpoints.{name}.{route.upper()}}}}}
""")
        events_block = "\n".join(route_events)
    else:
        events_block = f"""    - eventBridge:
        pattern:
          source:
            - prefix: "dance-engine."
          detail-type:
            - prefix: "object.action"
"""

    return f"""{name_pascal}:
  runtime: python3.11
  handler: {lambda_dir.relative_to(BASE)}/handler_{name}.lambda_handler
  name: "${{sls:stage}}-${{self:service}}-{name}"
  package:
    patterns:
      - '!**/**'
      - "{lambda_dir.relative_to(BASE)}/**"
    #   - "_pydantic/**" # this requires the pydantic layer also
  environment:
      STAGE_NAME: ${{sls:stage}}
  layers:
      - !Ref UtilsLambdaLayer
    #   - !Ref PydanticLambdaLayer # uncomment if you need pydantic layer
  events:
{events_block}
"""

def doc_yaml(name: str) -> str:
    lines = ["endpoints:"]
    routes = ["GET", "POST", "PUT"]
    for route in routes:
        lines.append(f"""  {name}:
    {route.upper()}:
      summary: "{route.upper()} {name}"
      description: "Handle {route.upper()} requests for /{{organisation}}/{name}"
      tags:
        - {name}
      ## uncomment this and the next line if this is a public endpoint
      #security:
      #  - {{}}
      ## comment if does not includes path params
      pathParams:
       - name: organisation
         description: Organisation slug
         schema:
           type: string
      ## uncomment if this is a POST request and define model
      #requestBody:
      #  description: "Description of the request body"
      #requestModels:
      #  application/json: "Create{name}Request" # models defined in serverless.models.yml in top level for now
      methodResponses:
        - statusCode: 200
          responseBody:
            description: Success
        - statusCode: 405
          responseBody:
            description: Method Not Allowed
        - statusCode: 500
          responseBody:
            description: Internal Server Error
""")
    return "\n".join(lines)

def append_to_serverless_yaml(name: str, lambda_dir: Path):
    pascal = snake_to_pascal(name)
    function_config_path = (lambda_dir / f"sls.{name}.function.yml").relative_to(BASE)
    include_line = f"  {pascal}: ${{file({function_config_path}):{name}}}"
    with open(SERVERLESS_YML, "r") as f:
        lines = f.readlines()

    if any(include_line.strip() in line for line in lines):
        return  # Already included

    try:
        idx = next(i for i, line in enumerate(lines) if line.strip().startswith("functions:"))
    except StopIteration:
        typer.echo("❌ Could not find 'config:' block in serverless.yml")
        return

    for j in range(idx, len(lines)):
        if lines[j].strip().startswith("functions:"):
            # insert just below this
            lines.insert(j + 1, f"{include_line}\n")
            break
    else:
        # If we don't find it, add to the bottom
        lines.append("\nfunctions:\n")
        lines.append(f"{include_line}\n")

    with open(SERVERLESS_YML, "w") as f:
        f.writelines(lines)

    typer.echo(f"📎 Added function config to serverless.yml: {include_line}")

def remove_from_serverless_yaml(name: str, lambda_dir: Path):
    pascal = snake_to_pascal(name)
    function_config_path = (lambda_dir / f"sls.{name}.function.yml").relative_to(BASE)
    include_line = f"  {pascal}: ${{file({function_config_path}):{name}}}"
    with open(SERVERLESS_YML, "r") as f:
        lines = f.readlines()

    new_lines = [line for line in lines if include_line.strip() not in line.strip()]
    if len(new_lines) == len(lines):
        typer.echo("ℹ️  No serverless.yml include line found to remove.")
    else:
        with open(SERVERLESS_YML, "w") as f:
            f.writelines(new_lines)
        typer.echo(f"🧹 Removed function config from serverless.yml.")

if __name__ == "__main__":
    app()
