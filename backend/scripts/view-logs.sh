#!/bin/bash

# Script to view Docker logs easily

SERVICE=${1:-backend}
LINES=${2:-100}
FOLLOW=${3:-false}

if [ "$FOLLOW" = "true" ] || [ "$FOLLOW" = "-f" ]; then
    echo "Following logs from $SERVICE (Ctrl+C to exit)..."
    docker-compose logs -f --tail=$LINES $SERVICE
else
    echo "Viewing last $LINES lines from $SERVICE..."
    docker-compose logs --tail=$LINES $SERVICE
fi

