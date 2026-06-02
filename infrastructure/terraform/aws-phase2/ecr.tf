# AWS ECR (Elastic Container Registry) for imobi-api
# Stores Docker images for ECS deployment

resource "aws_ecr_repository" "imobi_api" {
  name                 = "imobi-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "imobi-api-repository"
    Environment = var.environment
    Phase       = "Phase2"
  }
}

# ECR repository policy - allow pulling images from ECS
resource "aws_ecr_repository_policy" "imobi_api" {
  repository = aws_ecr_repository.imobi_api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}

# Life cycle policy to keep only last 10 images
resource "aws_ecr_lifecycle_policy" "imobi_api" {
  repository = aws_ecr_repository.imobi_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Output ECR URI for use in task definitions
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.imobi_api.repository_url
}

output "ecr_registry_id" {
  description = "Registry ID of the ECR repository"
  value       = aws_ecr_repository.imobi_api.registry_id
}
