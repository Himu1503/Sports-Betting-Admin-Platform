#!/bin/bash

# Quick script to view application logs

SERVICE=${1:-backend}
LINES=${2:-50}
FOLLOW=${3:-false}

echo "========================================="
echo "Viewing logs for: $SERVICE"
echo "========================================="

if [ "$FOLLOW" = "true" ] || [ "$FOLLOW" = "-f" ]; then
    echo "Following logs (press Ctrl+C to stop)..."
    docker-compose logs -f $SERVICE
else
    echo "Showing last $LINES lines..."
    docker-compose logs --tail=$LINES $SERVICE
fi

