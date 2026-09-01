FROM php:8.4-fpm-alpine

COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions intl pdo_pgsql opcache zip

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app
