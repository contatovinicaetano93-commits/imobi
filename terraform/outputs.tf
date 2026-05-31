output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = aws_subnet.private.id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL hostname"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgres.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (host:port)"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_address" {
  description = "ElastiCache Redis hostname"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.port
}

output "api_instance_id" {
  description = "EC2 instance ID for NestJS API"
  value       = aws_instance.api.id
}

output "api_instance_public_ip" {
  description = "Public IP address of NestJS API instance"
  value       = aws_eip.api.public_ip
}

output "api_public_dns" {
  description = "Public DNS of NestJS API instance"
  value       = aws_instance.api.public_dns
}

output "api_url" {
  description = "NestJS API URL"
  value       = "http://${aws_eip.api.public_ip}:${var.api_port}"
}

output "api_ssh_command" {
  description = "SSH command to connect to API instance"
  value       = "ssh -i /path/to/key.pem ubuntu@${aws_eip.api.public_ip}"
}

output "web_instance_id" {
  description = "EC2 instance ID for Next.js Web"
  value       = aws_instance.web.id
}

output "web_instance_public_ip" {
  description = "Public IP address of Next.js Web instance"
  value       = aws_eip.web.public_ip
}

output "web_public_dns" {
  description = "Public DNS of Next.js Web instance"
  value       = aws_instance.web.public_dns
}

output "web_url" {
  description = "Next.js Web URL"
  value       = "http://${aws_eip.web.public_ip}:${var.web_port}"
}

output "web_ssh_command" {
  description = "SSH command to connect to Web instance"
  value       = "ssh -i /path/to/key.pem ubuntu@${aws_eip.web.public_ip}"
}

output "s3_bucket_name" {
  description = "S3 bucket name for obra photos"
  value       = aws_s3_bucket.obra_photos.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.obra_photos.arn
}

output "s3_bucket_region" {
  description = "S3 bucket region"
  value       = aws_s3_bucket.obra_photos.region
}

output "api_security_group_id" {
  description = "Security group ID for EC2 instances"
  value       = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

output "cloudwatch_api_log_group" {
  description = "CloudWatch log group for API"
  value       = aws_cloudwatch_log_group.api.name
}

output "cloudwatch_web_log_group" {
  description = "CloudWatch log group for Web"
  value       = aws_cloudwatch_log_group.web.name
}

output "cloudwatch_rds_log_group" {
  description = "CloudWatch log group for RDS"
  value       = aws_cloudwatch_log_group.rds.name
}

output "deployment_info" {
  description = "Deployment summary"
  value = {
    region      = var.aws_region
    environment = var.environment
    api_endpoint = "http://${aws_eip.api.public_ip}:${var.api_port}"
    web_endpoint = "http://${aws_eip.web.public_ip}:${var.web_port}"
    database     = "postgres://${aws_db_instance.postgres.username}:****@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}"
    redis        = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
    s3_bucket    = aws_s3_bucket.obra_photos.id
  }
}
