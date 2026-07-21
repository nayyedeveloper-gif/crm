#!/usr/bin/env bash
# Start Spring Boot with env from /var/www/ecommerce/shared/backend.env
set -a
# shellcheck disable=SC1091
source /var/www/ecommerce/shared/backend.env
set +a
exec java -XX:MaxRAMPercentage=60 -XX:+UseG1GC -jar /var/www/ecommerce/backend/sale-crm-backend.jar
