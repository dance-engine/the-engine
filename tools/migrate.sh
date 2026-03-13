#!/usr/bin/env bash

# exit on error
set -eo pipefail

# Get org name from argument
ORG_NAME=""
AWS_REGION="eu-west-1"
AWS_PROFILE_ARG="${AWS_PROFILE:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)
      if [ -z "${2:-}" ]; then
        echo "Error: --profile requires a value"
        exit 1
      fi
      AWS_PROFILE_ARG="$2"
      shift 2
      ;;
    --region)
      if [ -z "${2:-}" ]; then
        echo "Error: --region requires a value"
        exit 1
      fi
      AWS_REGION="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 <org-name> [--region <aws-region>] [--profile <aws-profile>]"
      echo "Example: $0 my-org --region eu-west-1 --profile my-profile"
      exit 0
      ;;
    -*)
      echo "Error: unknown option '$1'"
      echo "Usage: $0 <org-name> [--region <aws-region>] [--profile <aws-profile>]"
      exit 1
      ;;
    *)
      if [ -n "$ORG_NAME" ]; then
        echo "Error: org name already set to '$ORG_NAME'"
        echo "Usage: $0 <org-name> [--region <aws-region>] [--profile <aws-profile>]"
        exit 1
      fi
      ORG_NAME="$1"
      shift
      ;;
  esac
done

if [ -z "$ORG_NAME" ]; then
  echo "Usage: $0 <org-name> [--region <aws-region>] [--profile <aws-profile>]"
  echo "Example: $0 my-org --region eu-west-1 --profile my-profile"
  exit 1
fi

AWS_ARGS=(--region "$AWS_REGION")

if [ -n "$AWS_PROFILE_ARG" ]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE_ARG")
fi

# tables
TABLE_FROM="prod-${ORG_NAME}"
TABLE_TO="preview-${ORG_NAME}"

# read
aws dynamodb scan \
  "${AWS_ARGS[@]}" \
  --table-name "$TABLE_FROM" \
  --output json \
 | jq "[ .Items[] | { PutRequest: { Item: . } } ]" \
 > "$TABLE_FROM-dump.json"

table_size="$(cat "${TABLE_FROM}-dump.json" | jq '. | length')"
echo "table size: ${table_size}"

# write in batches of 25
for i in $(seq 0 25 $table_size); do
  j=$(( i + 25 ))
  cat "${TABLE_FROM}-dump.json" | jq -c '{ "'$TABLE_TO'": .['$i':'$j'] }' > "${TABLE_TO}-batch-payload.json"
  echo "Loading records $i through $j (up to $table_size) into ${TABLE_TO}"
  aws dynamodb batch-write-item \
    "${AWS_ARGS[@]}" \
    --request-items file://"${TABLE_TO}-batch-payload.json"
  rm "${TABLE_TO}-batch-payload.json"
done


# clean up
rm "${TABLE_FROM}-dump.json"
