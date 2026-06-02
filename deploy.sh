#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "============================================="
echo "AdPulse.ai / SaaS Platform Deployment Script"
echo "============================================="

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed. Please install Docker first.' >&2
  exit 1
fi

# Determine docker compose command (check for v2 first, then v1)
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo 'Error: docker compose is not installed. Please install docker-compose first.' >&2
  exit 1
fi

echo "Pulling latest code changes (if in git repository)..."
if [ -d .git ]; then
  git pull origin main || echo "Warning: git pull failed, deploying current local files."
else
  echo "Not a git repository, skipping pull."
fi

echo "Cleaning up dangling images to free disk space..."
docker image prune -f || true

echo "Building and launching services in the background..."
$DOCKER_COMPOSE down --remove-orphans
$DOCKER_COMPOSE up -d --build

echo "Waiting for services to boot up and run health checks..."
sleep 10

echo "Checking running containers..."
docker ps

echo "Checking service health..."
# Check Nginx reverse proxy
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/healthz || echo "failed")

if [ "$STATUS_CODE" = "200" ]; then
  echo "✅ Success: Nginx is running and healthy!"
else
  echo "⚠️ Warning: Health check endpoint /healthz returned status code: $STATUS_CODE"
  echo "Checking nginx logs..."
  $DOCKER_COMPOSE logs nginx --tail=20
fi

echo "============================================="
echo "Deployment process finished!"
echo "Next.js Frontend is running on: http://your-ec2-ip"
echo "NestJS API is running on: http://your-ec2-ip/api"
echo "API Docs are available on: http://your-ec2-ip/api/docs"
echo "============================================="
