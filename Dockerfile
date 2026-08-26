FROM php:8.2-apache

# Install PDO SQLite extension
RUN apt-get update && apt-get install -y libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite

# Enable Apache mod_rewrite (useful if needed for custom routing)
RUN a2enmod rewrite

# Copy project files into Apache web directory
COPY . /var/www/html/

# Ensure Apache can write to the backend/data directory for SQLite persistence
RUN mkdir -p /var/www/html/backend/data \
    && chown -R www-data:www-data /var/www/html/backend/data \
    && chmod -R 775 /var/www/html/backend/data

# Configure Apache port dynamically from environment variable PORT (defaults to 80 if not set)
ENV PORT=80
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE 80