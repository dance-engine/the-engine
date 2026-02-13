import argparse
import os
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Attr
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

logging.basicConfig()

def _as_int(x, default=None):
    if x is None:
        return default
    if isinstance(x, bool):
        return default
    if isinstance(x, int):
        return x
    if isinstance(x, Decimal):
        return int(x)
    if isinstance(x, float):
        return int(x)
    if isinstance(x, str) and x.strip() != "":
        try:
            return int(x)
        except ValueError:
            return default
    return default


def backfill_events(
    table,
    *,
    dry_run: bool = True,
    page_size: int = 200):
    """
    Scans for event rows and updates missing fields
    """

    filter_expr = Attr("PK").begins_with("EVENT#") & Attr("SK").begins_with("EVENT#")

    projection = "PK, SK, #capacity, #number_sold, #reserved, #remaining_capacity"

    expr_names = {
        "#capacity": "capacity",
        "#number_sold": "number_sold",
        "#reserved": "reserved",
        "#remaining_capacity": "remaining_capacity",
    }

    scan_kwargs = {
        "FilterExpression": filter_expr,
        "ProjectionExpression": projection,
        "ExpressionAttributeNames": expr_names,
        "Limit": page_size,
    }

    updated = 0
    skipped = 0
    failed = 0

    last_evaluated_key = None
    while True:
        if last_evaluated_key:
            scan_kwargs["ExclusiveStartKey"] = last_evaluated_key

        resp = table.scan(**scan_kwargs)
        items = resp.get("Items", [])

        for it in items:
            pk = it.get("PK")
            sk = it.get("SK")

            capacity = _as_int(it.get("capacity"), default=None)
            number_sold = _as_int(it.get("number_sold"), default=0)

            # Decide whether we need to backfill anything
            needs_reserved = "reserved" not in it
            needs_remaining = "remaining_capacity" not in it
            needs_capacity = capacity is None or capacity == 0

            if not (needs_reserved or needs_remaining or needs_capacity):
                skipped += 1
                continue

            # if needs_remaining and capacity is None:
            #     # Can't compute remaining_capacity without capacity
            #     print(f"[SKIP] {pk} missing capacity; cannot compute remaining_capacity")
            #     skipped += 1
            #     continue

            if needs_capacity: capacity = 1

            remaining_capacity = None
            if needs_remaining:
                remaining_capacity = capacity - number_sold

            # Build an update that ONLY fills missing fields
            expr_names = {}
            expr_values = {}
            set_parts = []
            conditions = []

            if needs_capacity:
                expr_names["#capacity"] = "capacity"
                expr_values[":cap"] = capacity
                expr_values[":one"] = 1
                set_parts.append("#capacity = :cap")
                conditions.append("attribute_not_exists(#capacity) OR #capacity < :one")

            if needs_reserved:
                expr_names["#reserved"] = "reserved"
                expr_values[":zero"] = 0
                set_parts.append("#reserved = :zero")
                conditions.append("attribute_not_exists(#reserved)")

            if needs_remaining:
                expr_names["#remaining_capacity"] = "remaining_capacity"
                expr_values[":rc"] = remaining_capacity
                set_parts.append("#remaining_capacity = :rc")
                conditions.append("attribute_not_exists(#remaining_capacity)")

            update_expr = "SET " + ", ".join(set_parts)
            condition_expr = " AND ".join(conditions) if conditions else None

            if dry_run:
                print(f"[DRYRUN] {pk}: {update_expr}  values={expr_values}")
                updated += 1
                continue

            try:
                table.update_item(
                    Key={"PK": pk, "SK": sk},
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_values,
                    ConditionExpression=condition_expr,
                )
                updated += 1
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                print(f"[SKIP] {pk}: already backfilled")
                skipped += 1
            except Exception as e:
                print(f"[FAIL] {pk}: {e}")
                failed += 1

        last_evaluated_key = resp.get("LastEvaluatedKey")
        if not last_evaluated_key:
            break

    print("\nDone.")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--organisation", required=True, help="Organisation slug (org table name substitution)")
    parser.add_argument(
        "--table-template",
        default=os.environ.get("ORG_TABLE_NAME_TEMPLATE", "preview-org-org_name"),
        help="org table name template, must contain 'org_name' placeholder it begins with the stage ${sls:stage}-org-org_name",
    )
    parser.add_argument("--region", default=os.environ.get("AWS_REGION", "eu-west-1"))
    parser.add_argument("--profile", default=None, help="AWS profile name")
    parser.add_argument("--apply", action="store_true", help="Actually write changes (default is dry-run)")
    parser.add_argument("--page-size", type=int, default=200)
    args = parser.parse_args()

    if "org_name" not in args.table_template:
        raise ValueError("table-template must contain the placeholder 'org_name'")

    table_name = args.table_template.replace("org_name", args.organisation)

    session = boto3.Session(profile_name=args.profile, region_name=args.region) if args.profile else boto3.Session(region_name=args.region)
    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table(table_name)

    print(f"Table: {table_name}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")

    backfill_events(table, dry_run=(not args.apply), page_size=args.page_size)


if __name__ == "__main__":
    main()