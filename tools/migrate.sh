# exit on error
set -eo pipefail

# Get org name from argument
ORG_NAME=$1

if [ -z "$ORG_NAME" ]; then
  echo "Usage: $0 <org-name>"
  echo "Example: $0 my-org"
  exit 1
fi

# tables
TABLE_FROM="prod-${ORG_NAME}"
TABLE_TO="preview-${ORG_NAME}"

# read
aws dynamodb scan \
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
  aws dynamodb batch-write-item --request-items file://"${TABLE_TO}-batch-payload.json"
  rm "${TABLE_TO}-batch-payload.json"
done


# clean up
rm "${TABLE_FROM}-dump.json"
