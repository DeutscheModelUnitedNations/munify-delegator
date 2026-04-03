#!/bin/bash

# This script is used to restart the database container in the development environment.
POSTGRES_BACKUP_FILE=$1
VOLUME_NAME=${2:-munify-delegator_delegator-dev}

# Check if the backup file is provided
if [ -z "$POSTGRES_BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-postgres-backup-file> [volume-name]"
  exit 1
fi

if [ -z "$2" ]; then
  echo "  volume-name defaults to 'munify-delegator_delegator-dev'"
fi

# Stop the postgres container
echo "Stopping the postgres container..."
docker compose -f dev.docker-compose.yml stop postgres
docker compose -f dev.docker-compose.yml rm -f postgres

# Remove the database volume
echo "Removing the database volume '$VOLUME_NAME'..."
if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo "Error: Docker volume '$VOLUME_NAME' does not exist."
  exit 1
fi
docker volume rm "$VOLUME_NAME" || {
  echo "Error: Failed to remove volume '$VOLUME_NAME'."
  exit 1
}

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