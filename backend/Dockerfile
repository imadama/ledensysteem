FROM php:8.3-fpm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libzip-dev \
        unzip \
        git \
    && docker-php-ext-install pdo pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./

RUN composer install --prefer-dist --no-progress --no-interaction --no-scripts

COPY . .

RUN composer install --prefer-dist --no-progress --no-interaction

EXPOSE 8000

CMD ["sh", "-c", "composer install --prefer-dist --no-progress --no-interaction && php artisan migrate --force && php artisan db:seed --class=RolesAndAdminSeeder --force && php artisan serve --host=0.0.0.0 --port=8000"]

