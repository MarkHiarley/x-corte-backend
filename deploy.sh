#!/bin/bash

set -e

CONTAINER_NAME="x-corte-backend"
IMAGE_NAME="x-corte-backend:latest"
PORT=5000

echo "Starting deployment process..."

if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping existing container..."
    docker stop $CONTAINER_NAME
fi

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Removing existing container..."
    docker rm $CONTAINER_NAME
fi

echo "Building Docker image..."
docker build -t $IMAGE_NAME . --no-cache

echo "Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    --env-file .env \
    -p $PORT:$PORT \
    --restart unless-stopped \
    $IMAGE_NAME

echo "Verifying container status..."
sleep 5

if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Deployment completed successfully."
    echo "Application is running on http://localhost:$PORT"
    echo "API documentation available at http://localhost:$PORT/docs"
else
    echo "Deployment failed. Container is not running."
    echo "Checking logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi