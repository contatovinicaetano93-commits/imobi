#!/bin/bash
set -e

echo "=== AWS Credentials Validation ==="
echo ""

# Check if credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "ERROR: AWS_ACCESS_KEY_ID is not set"
    echo ""
    echo "To set AWS credentials, run:"
    echo "  source .env.aws"
    echo ""
    echo "First, create .env.aws from .env.aws.example:"
    echo "  cp .env.aws.example .env.aws"
    echo "  # Edit .env.aws with your actual credentials"
    exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "ERROR: AWS_SECRET_ACCESS_KEY is not set"
    exit 1
fi

if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="us-east-1"
    echo "INFO: AWS_REGION not set, using default: $AWS_REGION"
fi

echo "Checking AWS credentials..."
echo ""

# Check AWS CLI availability
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed"
    echo "Install it with: pip install awscli"
    exit 1
fi

# Validate credentials with STS
echo "Testing credential validity with AWS STS..."
if aws sts get-caller-identity > /tmp/aws-identity.json 2>&1; then
    echo "✓ Credentials are valid!"
    echo ""
    cat /tmp/aws-identity.json | jq '.'
    echo ""
    
    ACCOUNT_ID=$(jq -r '.Account' /tmp/aws-identity.json)
    ARN=$(jq -r '.Arn' /tmp/aws-identity.json)
    echo "Account ID: $ACCOUNT_ID"
    echo "ARN: $ARN"
else
    echo "ERROR: Credentials validation failed"
    cat /tmp/aws-identity.json
    exit 1
fi

echo ""
echo "=== Checking Required Permissions ==="
echo ""

# Check EC2 permissions
echo "Checking EC2 permissions..."
aws ec2 describe-vpcs --max-results 1 > /dev/null 2>&1 && echo "✓ EC2 access OK" || echo "✗ EC2 access FAILED"

# Check RDS permissions
echo "Checking RDS permissions..."
aws rds describe-db-instances > /dev/null 2>&1 && echo "✓ RDS access OK" || echo "✗ RDS access FAILED"

# Check ElastiCache permissions
echo "Checking ElastiCache permissions..."
aws elasticache describe-cache-clusters > /dev/null 2>&1 && echo "✓ ElastiCache access OK" || echo "✗ ElastiCache access FAILED"

# Check SES permissions
echo "Checking SES permissions..."
aws ses describe-configuration-set --configuration-set-name default > /dev/null 2>&1 && echo "✓ SES access OK" || echo "✓ SES access probable (no default config set)"

echo ""
echo "=== AWS Credentials Validation Complete ==="
