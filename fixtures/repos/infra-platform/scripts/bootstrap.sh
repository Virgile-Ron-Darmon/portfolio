#!/usr/bin/env bash
# Creates the state bucket and lock table once, before the first `terraform init`.
set -euo pipefail

BUCKET="${1:?usage: bootstrap.sh <bucket>}"
REGION="${AWS_REGION:-eu-west-2}"

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name infra-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST

echo "state backend ready: s3://$BUCKET"
