resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.private_subnets

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name   = "${var.project_name}-rds-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.project_name}-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "15.3"
  database_name           = "imobi_prod"
  master_username         = "postgres"
  master_password         = var.rds_master_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]

  backup_retention_period      = var.rds_backup_retention_days
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:05:00"

  storage_encrypted       = true
  kms_key_id             = aws_kms_key.rds.arn
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${var.project_name}-rds-cluster"
  }
}

resource "aws_rds_cluster_instance" "main_1" {
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.rds_instance_class
  engine              = aws_rds_cluster.main.engine
  engine_version      = aws_rds_cluster.main.engine_version

  publicly_accessible = false

  tags = {
    Name = "${var.project_name}-rds-instance-1"
  }
}

resource "aws_rds_cluster_instance" "main_2" {
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.rds_instance_class
  engine              = aws_rds_cluster.main.engine
  engine_version      = aws_rds_cluster.main.engine_version

  publicly_accessible = false

  tags = {
    Name = "${var.project_name}-rds-instance-2"
  }
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-rds-key"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-rds"
  target_key_id = aws_kms_key.rds.key_id
}
