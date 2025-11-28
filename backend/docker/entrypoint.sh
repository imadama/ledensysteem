#!/bin/sh
set -e

# Install dependencies if vendor directory doesn't exist or is empty
if [ ! -d "/var/www/html/vendor" ] || [ -z "$(ls -A /var/www/html/vendor)" ]; then
    echo "Installing Composer dependencies..."
    composer install --prefer-dist --no-progress --no-interaction --no-dev --optimize-autoloader
fi

# Ensure storage and cache directories have correct permissions
mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Execute the main command
exec "$@"

