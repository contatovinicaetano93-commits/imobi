#!/bin/bash
set -e

# imobi AWS Infrastructure Deployment Script
# Using AWS CLI only (no Terraform required)

AWS_REGION="sa-east-1"
APP_NAME="imobi"
ENVIRONMENT="production"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_CIDR="10.0.1.0/24"
PRIVATE_SUBNET_CIDR="10.0.2.0/24"
DB_PASSWORD=$(openssl rand -base64 32)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Create VPC
log_info "Criando VPC..."
VPC_ID=$(aws ec2 create-vpc --cidr-block $VPC_CIDR --region $AWS_REGION --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$APP_NAME-vpc}]" --query 'Vpc.VpcId' --output text)
log_success "VPC criada: $VPC_ID"

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION

# Create Internet Gateway
log_info "Criando Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway --region $AWS_REGION --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$APP_NAME-igw}]" --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION
log_success "Internet Gateway criado: $IGW_ID"

# Create Public Subnet
log_info "Criando subnets..."
AZ=$(aws ec2 describe-availability-zones --region $AWS_REGION --query 'AvailabilityZones[0].ZoneName' --output text)
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block $PUBLIC_SUBNET_CIDR --availability-zone $AZ --region $AWS_REGION --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-public-subnet}]" --query 'Subnet.SubnetId' --output text)
log_success "Public Subnet criada: $PUBLIC_SUBNET_ID"

# Create Private Subnet
PRIVATE_SUBNET_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block $PRIVATE_SUBNET_CIDR --availability-zone $AZ --region $AWS_REGION --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-private-subnet}]" --query 'Subnet.SubnetId' --output text)
log_success "Private Subnet criada: $PRIVATE_SUBNET_ID"

# Create Route Table for Public Subnet
log_info "Configurando rotas..."
PUBLIC_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $AWS_REGION --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-public-rt}]" --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PUBLIC_RT --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_ID --route-table-id $PUBLIC_RT --region $AWS_REGION
log_success "Rotas públicas configuradas"

# Create Security Groups
log_info "Criando Security Groups..."

# EC2 Security Group
EC2_SG=$(aws ec2 create-security-group --group-name "$APP_NAME-ec2-sg" --description "Security group for EC2 instances" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)

# Allow SSH, API port, Web port
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 3001 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $AWS_REGION

log_success "EC2 Security Group: $EC2_SG"

# RDS Security Group
RDS_SG=$(aws ec2 create-security-group --group-name "$APP_NAME-rds-sg" --description "Security group for RDS" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $EC2_SG --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region $AWS_REGION
log_success "RDS Security Group: $RDS_SG"

# Redis Security Group
REDIS_SG=$(aws ec2 create-security-group --group-name "$APP_NAME-redis-sg" --description "Security group for Redis" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG --protocol tcp --port 6379 --source-group $EC2_SG --region $AWS_REGION
log_success "Redis Security Group: $REDIS_SG"

# Create RDS Subnet Group
log_info "Criando RDS..."
aws rds create-db-subnet-group --db-subnet-group-name "$APP_NAME-db-subnet" --db-subnet-group-description "Subnet group for imobi RDS" --subnet-ids $PUBLIC_SUBNET_ID $PRIVATE_SUBNET_ID --region $AWS_REGION 2>/dev/null || true

# Create RDS PostgreSQL Instance
RDS_INSTANCE=$(aws rds create-db-instance \
  --db-instance-identifier "$APP_NAME-postgres" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --db-name imobi_prod \
  --db-subnet-group-name "$APP_NAME-db-subnet" \
  --vpc-security-group-ids $RDS_SG \
  --publicly-accessible \
  --backup-retention-period 7 \
  --region $AWS_REGION \
  --skip-final-snapshot \
  --query 'DBInstance.DBInstanceIdentifier' \
  --output text 2>/dev/null || echo "$APP_NAME-postgres")

log_success "RDS criado: $RDS_INSTANCE"
log_info "⏳ Aguardando RDS ficar disponível (isso pode levar 5-10 minutos)..."

# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier $RDS_INSTANCE --region $AWS_REGION || true

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $AWS_REGION --query 'DBInstances[0].Endpoint.Address' --output text)
log_success "RDS Endpoint: $RDS_ENDPOINT"

# Create ElastiCache Redis
log_info "Criando ElastiCache Redis..."

# Create ElastiCache Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name "$APP_NAME-redis-subnet" \
  --cache-subnet-group-description "Subnet group for Redis" \
  --subnet-ids $PUBLIC_SUBNET_ID $PRIVATE_SUBNET_ID \
  --region $AWS_REGION 2>/dev/null || true

# Create Redis Cluster
REDIS_ENDPOINT=$(aws elasticache create-cache-cluster \
  --cache-cluster-id "$APP_NAME-redis" \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name "$APP_NAME-redis-subnet" \
  --security-group-ids $REDIS_SG \
  --region $AWS_REGION \
  --query 'CacheCluster.CacheNodes[0].Address' \
  --output text 2>/dev/null || echo "pending")

log_success "Redis criado"
log_info "⏳ Aguardando Redis ficar disponível..."

aws elasticache wait cache-cluster-available --cache-cluster-id "$APP_NAME-redis" --region $AWS_REGION || true

REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id "$APP_NAME-redis" --show-cache-node-info --region $AWS_REGION --query 'CacheClusters[0].CacheNodes[0].Address' --output text)
log_success "Redis Endpoint: $REDIS_ENDPOINT"

# Create S3 Bucket
log_info "Criando S3 bucket..."
S3_BUCKET="$APP_NAME-obra-photos-$ACCOUNT_ID"

aws s3api create-bucket \
  --bucket $S3_BUCKET \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION 2>/dev/null || true

# Enable versioning
aws s3api put-bucket-versioning --bucket $S3_BUCKET --versioning-configuration Status=Enabled --region $AWS_REGION

# Block public access
aws s3api put-public-access-block \
  --bucket $S3_BUCKET \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $AWS_REGION

log_success "S3 Bucket: $S3_BUCKET"

# Get latest Ubuntu 22.04 LTS AMI
log_info "Buscando Ubuntu AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text \
  --region $AWS_REGION)

log_success "AMI selecionada: $AMI_ID"

# Create Key Pair
log_info "Criando Key Pair..."
mkdir -p ~/.ssh

aws ec2 create-key-pair --key-name "$APP_NAME-key" --region $AWS_REGION --query 'KeyMaterial' --output text > ~/.ssh/$APP_NAME-key.pem 2>/dev/null || true
chmod 600 ~/.ssh/$APP_NAME-key.pem
log_success "Key Pair: ~/.ssh/$APP_NAME-key.pem"

# Launch EC2 instances
log_info "Lançando EC2 instances..."

# API Instance
API_INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --subnet-id $PUBLIC_SUBNET_ID \
  --security-group-ids $EC2_SG \
  --key-name "$APP_NAME-key" \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME-api}]" \
  --query 'Instances[0].InstanceId' \
  --output text \
  --region $AWS_REGION)

log_success "API Instance lançada: $API_INSTANCE"

# Web Instance
WEB_INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --subnet-id $PUBLIC_SUBNET_ID \
  --security-group-ids $EC2_SG \
  --key-name "$APP_NAME-key" \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME-web}]" \
  --query 'Instances[0].InstanceId' \
  --output text \
  --region $AWS_REGION)

log_success "Web Instance lançada: $WEB_INSTANCE"

# Wait for instances to get public IPs
log_info "⏳ Aguardando instâncias ficarem prontas..."
sleep 10

API_IP=$(aws ec2 describe-instances --instance-ids $API_INSTANCE --region $AWS_REGION --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
WEB_IP=$(aws ec2 describe-instances --instance-ids $WEB_INSTANCE --region $AWS_REGION --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

log_success "API Public IP: $API_IP"
log_success "Web Public IP: $WEB_IP"

# Save configuration
log_info "Salvando configuração..."
cat > /tmp/imobi-aws-config.txt << EOF
=== imobi AWS Infrastructure ===
Region: $AWS_REGION
Account ID: $ACCOUNT_ID

VPC: $VPC_ID
Public Subnet: $PUBLIC_SUBNET_ID
Private Subnet: $PRIVATE_SUBNET_ID

RDS PostgreSQL:
  Instance: $RDS_INSTANCE
  Endpoint: $RDS_ENDPOINT
  Port: 5432
  Database: imobi_prod
  User: postgres
  Password: $DB_PASSWORD

ElastiCache Redis:
  Endpoint: $REDIS_ENDPOINT
  Port: 6379

EC2 Instances:
  API Instance: $API_INSTANCE
  API IP: $API_IP
  API URL: http://$API_IP:3001

  Web Instance: $WEB_INSTANCE
  Web IP: $WEB_IP
  Web URL: http://$WEB_IP:3000

S3 Bucket: $S3_BUCKET

Key Pair: ~/.ssh/$APP_NAME-key.pem

Security Groups:
  EC2: $EC2_SG
  RDS: $RDS_SG
  Redis: $REDIS_SG

=== Next Steps ===
1. SSH to API: ssh -i ~/.ssh/$APP_NAME-key.pem ubuntu@$API_IP
2. SSH to Web: ssh -i ~/.ssh/$APP_NAME-key.pem ubuntu@$WEB_IP
3. Deploy apps using: scripts/deploy-api.sh $API_IP
4. Configure RDS: psql -h $RDS_ENDPOINT -U postgres
EOF

cat /tmp/imobi-aws-config.txt

log_success "Infraestrutura AWS criada com sucesso! ✨"
log_info "Configuração salva em: /tmp/imobi-aws-config.txt"
