# ═══════════════════════════════════════════════════════════════════════════════
#  AdPulse SaaS — Multi-Region Terraform Configuration
#  Kunal (DevOps / Infrastructure)
#
#  This file provisions the Disaster Recovery (DR) region (ap-southeast-1)
#  as a hot-standby mirror of the primary region (ap-south-1).
#
#  Resources created in DR region:
#   - VPC + subnets
#   - RDS Read Replica (cross-region)
#   - ElastiCache Redis (standalone)
#   - ECS Cluster (scaled to 0 — scales up on DR failover)
#   - ALB (pre-provisioned, Route53 TTL=60 for rapid cutover)
#   - CloudWatch Alarms → SNS → Slack Lambda
# ═══════════════════════════════════════════════════════════════════════════════

# ── DR Region Provider ─────────────────────────────────────────────────────────

provider "aws" {
  alias  = "dr"
  region = var.dr_region
}

# ── DR VPC ─────────────────────────────────────────────────────────────────────

resource "aws_vpc" "dr" {
  provider             = aws.dr
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "adpulse-dr-vpc"
    Environment = "${var.environment}-dr"
    ManagedBy   = "terraform"
  }
}

data "aws_availability_zones" "dr_available" {
  provider = aws.dr
  state    = "available"
}

resource "aws_subnet" "dr_public" {
  count                   = 2
  provider                = aws.dr
  vpc_id                  = aws_vpc.dr.id
  cidr_block              = cidrsubnet("10.1.0.0/16", 8, count.index)
  availability_zone       = data.aws_availability_zones.dr_available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "adpulse-dr-public-${count.index + 1}" }
}

resource "aws_subnet" "dr_private" {
  count             = 2
  provider          = aws.dr
  vpc_id            = aws_vpc.dr.id
  cidr_block        = cidrsubnet("10.1.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.dr_available.names[count.index]

  tags = { Name = "adpulse-dr-private-${count.index + 1}" }
}

resource "aws_internet_gateway" "dr_igw" {
  provider = aws.dr
  vpc_id   = aws_vpc.dr.id
  tags     = { Name = "adpulse-dr-igw" }
}

resource "aws_route_table" "dr_public" {
  provider = aws.dr
  vpc_id   = aws_vpc.dr.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dr_igw.id
  }
}

resource "aws_route_table_association" "dr_public" {
  count          = 2
  provider       = aws.dr
  subnet_id      = aws_subnet.dr_public[count.index].id
  route_table_id = aws_route_table.dr_public.id
}

# ── DR Security Groups ─────────────────────────────────────────────────────────

resource "aws_security_group" "dr_alb_sg" {
  provider    = aws.dr
  name        = "adpulse-dr-alb-sg"
  description = "Allow HTTP/HTTPS from internet (DR)"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "dr_ecs_sg" {
  provider    = aws.dr
  name        = "adpulse-dr-ecs-sg"
  description = "ECS tasks (DR)"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_alb_sg.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "dr_rds_sg" {
  provider    = aws.dr
  name        = "adpulse-dr-rds-sg"
  description = "PostgreSQL (DR)"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_ecs_sg.id]
  }
}

# ── RDS Cross-Region Read Replica ──────────────────────────────────────────────

resource "aws_db_subnet_group" "dr" {
  provider   = aws.dr
  name       = "adpulse-dr-db-subnet"
  subnet_ids = aws_subnet.dr_private[*].id
}

resource "aws_db_instance" "dr_replica" {
  provider               = aws.dr
  identifier             = "adpulse-dr-postgres-replica"
  replicate_source_db    = aws_db_instance.postgres.arn  # Reference primary RDS ARN
  instance_class         = var.db_instance_class
  db_subnet_group_name   = aws_db_subnet_group.dr.name
  vpc_security_group_ids = [aws_security_group.dr_rds_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = true
  publicly_accessible    = false

  # Read replicas do NOT have backup settings — controlled by primary
  backup_retention_period = 0

  tags = {
    Name        = "adpulse-dr-postgres-replica"
    Environment = "${var.environment}-dr"
    Role        = "read-replica"
  }

  lifecycle {
    # Prevent accidental destruction of the replica
    prevent_destroy = true
  }
}

# ── DR ElastiCache Redis (independent) ────────────────────────────────────────

resource "aws_elasticache_subnet_group" "dr" {
  provider   = aws.dr
  name       = "adpulse-dr-redis-subnet"
  subnet_ids = aws_subnet.dr_private[*].id
}

resource "aws_security_group" "dr_redis_sg" {
  provider    = aws.dr
  name        = "adpulse-dr-redis-sg"
  description = "Redis (DR)"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_ecs_sg.id]
  }
}

resource "aws_elasticache_replication_group" "dr_redis" {
  provider             = aws.dr
  replication_group_id = "adpulse-dr-redis"
  description          = "AdPulse Redis DR (ap-southeast-1)"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  subnet_group_name    = aws_elasticache_subnet_group.dr.name
  security_group_ids   = [aws_security_group.dr_redis_sg.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = { Name = "adpulse-dr-redis", Environment = "${var.environment}-dr" }
}

# ── DR ECS Cluster (hot-standby — 0 desired until failover) ───────────────────

resource "aws_ecs_cluster" "dr" {
  provider = aws.dr
  name     = "adpulse-dr"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "dr" {
  provider           = aws.dr
  cluster_name       = aws_ecs_cluster.dr.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

resource "aws_iam_role" "dr_ecs_task_execution" {
  provider = aws.dr
  name     = "adpulse-dr-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dr_ecs_task_execution" {
  provider   = aws.dr
  role       = aws_iam_role.dr_ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "dr_api" {
  provider                 = aws.dr
  family                   = "adpulse-dr-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.dr_ecs_task_execution.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = var.api_image
    essential = true
    portMappings = [{ containerPort = 3001, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT",     value = "3001" },
      { name = "DATABASE_URL",
        value = "postgresql://adpulse_admin:${var.db_password}@${aws_db_instance.dr_replica.address}:5432/adpulse" },
      { name = "REDIS_URL",
        value = "rediss://${aws_elasticache_replication_group.dr_redis.primary_endpoint_address}:6379" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/adpulse-dr-api"
        "awslogs-region"        = var.dr_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "dr_web" {
  provider                 = aws.dr
  family                   = "adpulse-dr-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.dr_ecs_task_execution.arn

  container_definitions = jsonencode([{
    name      = "web"
    image     = var.web_image
    essential = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV",            value = var.environment },
      { name = "NEXT_PUBLIC_API_URL", value = "https://api.adpulse.io" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/adpulse-dr-web"
        "awslogs-region"        = var.dr_region
        "awslogs-stream-prefix" = "web"
      }
    }
  }])
}

# Desired count = 0 at rest; dr-failover.sh scales this to 2
resource "aws_ecs_service" "dr_api" {
  provider        = aws.dr
  name            = "adpulse-api"
  cluster         = aws_ecs_cluster.dr.id
  task_definition = aws_ecs_task_definition.dr_api.arn
  desired_count   = 0   # Scaled to 2 during failover

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  network_configuration {
    subnets          = aws_subnet.dr_private[*].id
    security_groups  = [aws_security_group.dr_ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dr_api.arn
    container_name   = "api"
    container_port   = 3001
  }

  deployment_circuit_breaker { enable = true; rollback = true }

  lifecycle { ignore_changes = [desired_count] }
}

resource "aws_ecs_service" "dr_web" {
  provider        = aws.dr
  name            = "adpulse-web"
  cluster         = aws_ecs_cluster.dr.id
  task_definition = aws_ecs_task_definition.dr_web.arn
  desired_count   = 0

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  network_configuration {
    subnets          = aws_subnet.dr_private[*].id
    security_groups  = [aws_security_group.dr_ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dr_web.arn
    container_name   = "web"
    container_port   = 3000
  }

  lifecycle { ignore_changes = [desired_count] }
}

# ── DR ALB ─────────────────────────────────────────────────────────────────────

resource "aws_lb" "dr" {
  provider           = aws.dr
  name               = "adpulse-dr-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.dr_alb_sg.id]
  subnets            = aws_subnet.dr_public[*].id

  enable_deletion_protection = true
  tags = { Name = "adpulse-dr-alb", Environment = "${var.environment}-dr" }
}

resource "aws_lb_target_group" "dr_api" {
  provider    = aws.dr
  name        = "adpulse-dr-api-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.dr.id
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "dr_web" {
  provider    = aws.dr
  name        = "adpulse-dr-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.dr.id
  target_type = "ip"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "dr_http" {
  provider          = aws.dr
  load_balancer_arn = aws_lb.dr.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── CloudWatch Alarms → SNS (Primary Region Health Monitor) ───────────────────

resource "aws_cloudwatch_metric_alarm" "primary_rds_cpu" {
  alarm_name          = "adpulse-primary-rds-cpu-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Primary RDS CPU > 90% for 3 minutes — possible failover needed"
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.identifier
  }

  alarm_actions = [aws_sns_topic.ops_alerts.arn]
  ok_actions    = [aws_sns_topic.ops_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "primary_alb_5xx" {
  alarm_name          = "adpulse-primary-alb-5xx-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Primary ALB returning > 50 5xx errors/min — service degraded"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.ops_alerts.arn]
}

# ── SNS Topic for Ops Alerts ───────────────────────────────────────────────────

resource "aws_sns_topic" "ops_alerts" {
  name = "adpulse-ops-alerts"
  tags = { Environment = var.environment }
}

variable "ops_alert_email" {
  description = "Email address for SNS ops alerts"
  type        = string
  default     = "kunal@adpulse.io"
}

resource "aws_sns_topic_subscription" "ops_email" {
  topic_arn = aws_sns_topic.ops_alerts.arn
  protocol  = "email"
  endpoint  = var.ops_alert_email
}

# ── CloudWatch Log Groups (DR) ─────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "dr_api" {
  provider          = aws.dr
  name              = "/ecs/adpulse-dr-api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "dr_web" {
  provider          = aws.dr
  name              = "/ecs/adpulse-dr-web"
  retention_in_days = 30
}

# ── DR Outputs ─────────────────────────────────────────────────────────────────

output "dr_alb_dns_name" {
  value       = aws_lb.dr.dns_name
  description = "DR ALB — point Route53 CNAME here during failover"
}

output "dr_rds_endpoint" {
  value       = aws_db_instance.dr_replica.address
  description = "DR PostgreSQL read-replica endpoint"
  sensitive   = true
}

output "dr_redis_endpoint" {
  value       = aws_elasticache_replication_group.dr_redis.primary_endpoint_address
  description = "DR Redis endpoint"
  sensitive   = true
}
