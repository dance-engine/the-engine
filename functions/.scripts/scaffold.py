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
    routes: Optional[List[str]] = typer.Option(None, help="List of HTTP method + path pairs for this function. (e.g. [\"GET /public/events\", \"POST /\{organisation\}/events\"])"),
    directory: Annotated[str, typer.Option("--directory", "-d", help="Target directoryfor this lambda")] = "functions"
):
    """
    Scaffold a new Lambda
    """

    use_flat_method_name = False
    if routes is None:
        use_flat_method_name = True
        routes = [f"GET /{name}"]

    # Create folder and base files
    target_dir = BASE / directory
    lambda_dir = target_dir / name
    lambda_dir.mkdir(parents=True, exist_ok=True)

    # Write handler.py
    handler_file = lambda_dir / f"handler_{name}.py"
    if not handler_file.exists():
        handler_file.write_text(handler_template(name))

    # Create method files (get_all.py, post.py, etc.)
    for route in routes:
        method, path = route.split()
        filename = f"lambda_{name}.py" if use_flat_method_name else f"lambda_{name}_{method.lower()}.py"
        method_file = lambda_dir / filename
        if not method_file.exists():
            method_file.write_text(method_template(name, method.lower(), path))

    # Write function config
    function_config = lambda_dir / f"sls.{name}.function.yml"
    function_config.parent.mkdir(parents=True, exist_ok=True)
    function_config.write_text(function_yaml(name, routes, lambda_dir))

    # Write doc config
    doc_config = lambda_dir / f"sls.{name}.doc.yml"
    doc_config.parent.mkdir(parents=True, exist_ok=True)
    doc_config.write_text(doc_yaml(name, routes))

    # Write placeholder model config
    models_config = lambda_dir / f"sls.{name}.models.yml"
    models_config.parent.mkdir(parents=True, exist_ok=True)
    models_config.write_text(" ")

    # Append function include to serverless.yml
    append_to_serverless_yaml(name, lambda_dir)

    typer.echo(f"✅ Lambda '{name}' scaffolded in '{directory}/' with routes: {routes}")

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

def handler_template(name: str) -> str:
    return f"""# python libraries
import os
import json
import logging

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")    

## the handler for incoming request
def lambda_handler(event, context):
    http_method = event['requestContext']["http"]["method"]

    if http_method == "GET":
        # TODO: implement
        return 
    elif http_method == "POST":
        return
    else:
        return {{
            "statusCode": 405, 
            "headers": {{ "Content-Type": "application/json" }}, 
            "body": json.dumps({{
                    "message": "Method not allowed."
                    }}, cls=DecimalEncoder)
            }}

"""

def method_template(name: str, method: str, path: str) -> str:
    return f"""## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
#db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))

## write here the code which is called from the handler
def {method}(data):
    # TODO: implement
    return {{
        "statusCode": 200, 
        "headers": {{ "Content-Type": "application/json" }}, 
        "body": json.dumps(events, cls=DecimalEncoder)
        }}

"""

def function_yaml(name: str, routes: List[str], lambda_dir: Path) -> str:
    name_pascal = snake_to_pascal(name)
    route_events = []
    for route in routes:
        method, path = route.split()
        route_events.append(f"""      - httpApi:
          path: {path}
          method: {method.lower()}
          authorizer:
            adminAuthorizer
          documentation: ${{{{file({lambda_dir}/sls.{name}.doc.yml):endpoints.{name}.{method.upper()}}}}}        
""")
    events_block = "\n".join(route_events)

    return f"""{name_pascal}:
  runtime: python3.11
  handler: {lambda_dir}/{name}/handler_{name}.lambda_handler
  name: "${{sls:stage}}-${{self:service}}-{name}"
  package:
      patterns:
      - '!**/**'
      - "{lambda_dir}/**"
      - "_shared/**"
  environment:
      STAGE_NAME: ${{sls:stage}}
  layers:
      - !Ref UtilsLambdaLayer
  events:
{events_block}
"""

def doc_yaml(name: str, routes: List[str]) -> str:
    lines = ["endpoints:"]
    for route in routes:
        method, path = route.split()
        lines.append(f"""  {name}:
    {method.upper()}:
      summary: "{method.upper()} {name}"
      description: "Handle {method.upper()} requests for {path}"
      tags:
        - {name}
      ## uncomment this and the next line if this is a public endpoint
      #security:
      #  - {{}}
      ## uncomment if includes path params  
      #pathParams:
      #  - name: organisation
      #    description: Organisation slug
      #    schema:
      #      type: string
      ## uncomment if this is a POST request and define model
      #requestBody:
      #  description: "Event details"
      #requestModels:
      #  application/json: "CreateEventRequest" # models defined in serverless.models.yml in top level for now
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
    include_line = f"  {pascal}: ${{file({lambda_dir}/sls.{name}.function.yml):{name}}}"
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
    include_line = f"  {pascal}: ${{file({lambda_dir}/sls.{name}.function.yml):{name}}}"
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
