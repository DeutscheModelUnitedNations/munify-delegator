#!/bin/bash

# This script is used to restart the database container in the development environment.
POSTGRES_BACKUP_FILE=$1

# Check if the backup file is provided
if [ -z "$POSTGRES_BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-postgres-backup-file>"
  exit 1
fi

# Stop any running containers
echo "Stopping any running containers..."
docker compose -f dev.docker-compose.yml down

# Remove the database volume
echo "Removing the database volume..."
docker volume rm delegator_delegator-dev

# Start just the database container
echo "Starting the database container..."
docker compose -f dev.docker-compose.yml up -d postgres

# Wait for the database to be ready
echo "Waiting for the database to be ready..."
sleep 3

# Restore the database from the backup file
echo "Restoring the database from the backup file..."
docker exec -i postgres-dev-delegator psql -U postgres -d postgres <$POSTGRES_BACKUP_FILE

# Apply latest migrations
echo "Applying latest migrations..."
bunx prisma migrate dev

# Stop the database container
echo "Stopping the database container..."
docker compose -f dev.docker-compose.yml down

echo "Database restart complete."
