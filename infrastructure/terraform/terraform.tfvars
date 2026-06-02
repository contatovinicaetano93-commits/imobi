aws_region   = "us-east-1"
environment  = "production"
project_name = "imobi"

vpc_cidr = "10.0.0.0/16"

rds_instance_class        = "db.r6i.xlarge"
rds_allocated_storage     = 100
rds_backup_retention_days = 30

elasticache_instance_type = "cache.r6g.xlarge"

ecs_api_cpu           = 4096
ecs_api_memory        = 8192
ecs_api_desired_count = 2

ecs_web_cpu           = 1024
ecs_web_memory        = 2048
ecs_web_desired_count = 2

ecs_worker_cpu           = 2048
ecs_worker_memory        = 4096
ecs_worker_desired_count = 1

s3_bucket_name = "imobi-obras-production"

enable_cloudfront = true
enable_waf        = true
