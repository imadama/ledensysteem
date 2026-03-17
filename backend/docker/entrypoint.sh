#!/bin/sh
set -e

# Install dependencies if vendor directory doesn't exist or is empty
if [ ! -d "/var/www/html/vendor" ] || [ -z "$(ls -A /var/www/html/vendor)" ]; then
    echo "Installing Composer dependencies..."
    composer install --prefer-dist --no-progress --no-interaction --no-dev --optimize-autoloader
fi

# Validate APP_URL before writing to .env.
# Symfony's Request::create() (called by SetRequestForConsole on every artisan bootstrap)
# throws "Invalid URI: Host is malformed" for hostnames containing underscores or other
# characters outside [a-zA-Z0-9.-]. A bad APP_URL will crash php artisan serve on startup.
_APP_URL="${APP_URL:-http://localhost}"
# Ensure scheme is present so the host extraction below works correctly
case "$_APP_URL" in
    http://*|https://*) ;;
    *) _APP_URL="http://$_APP_URL" ;;
esac
# Extract just the hostname (strip scheme, port, path)
_APP_HOST=$(printf '%s' "$_APP_URL" | sed 's|^[^:]*://||' | cut -d'/' -f1 | cut -d':' -f1)
# Reject hostnames with characters outside the valid set (e.g. underscores from Coolify service names)
case "$_APP_HOST" in
    *[!a-zA-Z0-9.-]*|"")
        echo "WARNING: APP_URL '$_APP_URL' has invalid host '$_APP_HOST' — falling back to http://localhost to prevent Symfony crash"
        _APP_URL="http://localhost"
        ;;
esac
echo "Effective APP_URL: $_APP_URL"

# Always create/update .env file from environment variables
echo "Creating/updating .env file from environment variables..."
cat > /var/www/html/.env << EOF
APP_NAME=${APP_NAME:-Laravel}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=$_APP_URL
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-}
DB_USERNAME=${DB_USERNAME:-}
DB_PASSWORD=${DB_PASSWORD:-}

SESSION_DOMAIN=${SESSION_DOMAIN:-}
SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS:-}
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-}

MAIL_MAILER=${MAIL_MAILER:-smtp}
MAIL_HOST=${MAIL_HOST:-}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USERNAME=${MAIL_USERNAME:-}
MAIL_PASSWORD=${MAIL_PASSWORD:-}
MAIL_ENCRYPTION=${MAIL_ENCRYPTION:-tls}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS:-}
MAIL_FROM_NAME=${MAIL_FROM_NAME:-}

STRIPE_SECRET=${STRIPE_SECRET:-}
STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
STRIPE_CONNECT_CLIENT_ID=${STRIPE_CONNECT_CLIENT_ID:-}
STRIPE_CONNECT_ACCOUNT_TYPE=${STRIPE_CONNECT_ACCOUNT_TYPE:-express}
STRIPE_DEFAULT_CURRENCY=${STRIPE_DEFAULT_CURRENCY:-eur}
STRIPE_PRICE_BASIC=${STRIPE_PRICE_BASIC:-}
STRIPE_PRICE_PLUS=${STRIPE_PRICE_PLUS:-}
STRIPE_PRICE_ENTERPRISE=${STRIPE_PRICE_ENTERPRISE:-}
EOF

# Ensure storage and cache directories have correct permissions
mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Execute the main command
exec "$@"

