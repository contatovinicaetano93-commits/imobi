variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "project_name" {
  type = string
}

variable "rds_instance_class" {
  type = string
}

variable "rds_backup_retention_days" {
  type = number
}

variable "rds_master_password" {
  type      = string
  sensitive = true
}
