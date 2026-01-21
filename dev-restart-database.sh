#!/bin/bash

# This script is used to restart the database container in the development environment.
POSTGRES_BACKUP_FILE=$1

# Check if the backup file is provided
if [ -z "$POSTGRES_BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-postgres-backup-file>"
  exit 1
fi

# Stop the postgres container
echo "Stopping the postgres container..."
docker compose -f dev.docker-compose.yml stop postgres
docker compose -f dev.docker-compose.yml rm -f postgres

# Remove the database volume
echo "Removing the database volume..."
docker volume rm delegator_delegator-dev

# Start the postgres container
echo "Starting the postgres container..."
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

# Stop the postgres container
echo "Stopping the postgres container..."
docker compose -f dev.docker-compose.yml stop postgres

echo "Database restart complete."
