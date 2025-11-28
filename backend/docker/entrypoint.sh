#!/bin/sh
set -e

# Install dependencies if vendor directory doesn't exist or is empty
if [ ! -d "/var/www/html/vendor" ] || [ -z "$(ls -A /var/www/html/vendor)" ]; then
    echo "Installing Composer dependencies..."
    composer install --prefer-dist --no-progress --no-interaction --no-dev --optimize-autoloader
fi

# Execute the main command
exec "$@"

