# ────────────────────────────────────────────────────────
# AWS Secrets Manager - Application Secrets Storage
# ────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "imbobi_production" {
  name                    = "imobi/production"
  description             = "Production environment secrets for imobi application"
  recovery_window_in_days = 7

  tags = {
    Name        = "imobi-production-secrets"
    Environment = "production"
  }
}

resource "aws_secretsmanager_secret" "imbobi_staging" {
  name                    = "imobi/staging"
  description             = "Staging environment secrets for imobi application"
  recovery_window_in_days = 7

  tags = {
    Name        = "imobi-staging-secrets"
    Environment = "staging"
  }
}

resource "aws_secretsmanager_secret_version" "imbobi_production" {
  secret_id = aws_secretsmanager_secret.imbobi_production.id
  secret_string = jsonencode({
    # Database
    DATABASE_URL = "postgresql://${aws_db_instance.postgres.username}:${random_password.rds_password.result}@${aws_db_instance.postgres.address}:5432/${aws_db_instance.postgres.db_name}"

    # Redis/ElastiCache
    REDIS_HOST = aws_elasticache_cluster.redis.cache_nodes[0].address
    REDIS_PORT = tostring(aws_elasticache_cluster.redis.port)

    # JWT
    JWT_SECRET             = var.jwt_secret
    JWT_EXPIRES_IN         = "15m"
    JWT_REFRESH_EXPIRES_IN = "7d"

    # Encryption
    ENCRYPTION_KEY = var.encryption_key

    # AWS
    AWS_REGION            = var.aws_region
    AWS_ACCESS_KEY_ID     = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key

    # S3
    S3_BUCKET = var.s3_bucket_name

    # SES Email
    USE_AWS_SES    = "true"
    SES_FROM_EMAIL = aws_sesv2_email_identity.imbobi.email_address

    # Application
    PORT                = "4000"
    NODE_ENV            = "production"
    CORS_ORIGIN         = var.cors_origin
    APP_URL             = var.app_url
    NEXT_PUBLIC_API_URL = var.api_url

    # Mobile
    EXPO_PUBLIC_API_URL = var.api_url

    # External APIs
    UNICO_API_KEY = var.unico_api_key
    SERPRO_TOKEN  = var.serpro_token
  })

  depends_on = [
    aws_secretsmanager_secret.imbobi_production,
    aws_db_instance.postgres,
    aws_elasticache_cluster.redis,
    aws_sesv2_email_identity.imbobi,
  ]
}

resource "aws_secretsmanager_secret_version" "imbobi_staging" {
  secret_id = aws_secretsmanager_secret.imbobi_staging.id
  secret_string = jsonencode({
    # Database
    DATABASE_URL = "postgresql://${aws_db_instance.postgres.username}:${random_password.rds_password.result}@${aws_db_instance.postgres.address}:5432/imbobi_staging"

    # Redis/ElastiCache
    REDIS_HOST = aws_elasticache_cluster.redis.cache_nodes[0].address
    REDIS_PORT = tostring(aws_elasticache_cluster.redis.port)

    # JWT
    JWT_SECRET             = var.jwt_secret
    JWT_EXPIRES_IN         = "15m"
    JWT_REFRESH_EXPIRES_IN = "7d"

    # Encryption
    ENCRYPTION_KEY = var.encryption_key

    # AWS
    AWS_REGION            = var.aws_region
    AWS_ACCESS_KEY_ID     = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key

    # S3
    S3_BUCKET = var.s3_bucket_name

    # SES Email
    USE_AWS_SES    = "true"
    SES_FROM_EMAIL = aws_sesv2_email_identity.imbobi.email_address

    # Application
    PORT                = "4000"
    NODE_ENV            = "staging"
    CORS_ORIGIN         = var.cors_origin
    APP_URL             = var.app_url
    NEXT_PUBLIC_API_URL = var.api_url

    # Mobile
    EXPO_PUBLIC_API_URL = var.api_url

    # External APIs
    UNICO_API_KEY = var.unico_api_key
    SERPRO_TOKEN  = var.serpro_token
  })

  depends_on = [
    aws_secretsmanager_secret.imbobi_staging,
    aws_db_instance.postgres,
    aws_elasticache_cluster.redis,
    aws_sesv2_email_identity.imbobi,
  ]
}

# ────────────────────────────────────────────────────────
# IAM Policy for SecretsManager Access
# ────────────────────────────────────────────────────────

resource "aws_iam_policy" "secrets_manager_access" {
  name        = "imobi-secrets-manager-access"
  description = "Policy for imobi ECS tasks to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = [
          aws_secretsmanager_secret.imbobi_production.arn,
          aws_secretsmanager_secret.imbobi_staging.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      },
    ]
  })
}

# ────────────────────────────────────────────────────────
# CloudWatch Log Group for Secrets Manager Audit
# ────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "secrets_audit" {
  name              = "/aws/secretsmanager/imobi"
  retention_in_days = 30

  tags = {
    Name = "imobi-secrets-audit-logs"
  }
}
