# Cheatsheet

## Docker

`docker compose up -d` — start php, nginx, postgres
`docker compose up -d --build` — rebuild images and start
`docker compose down` — stop everything
`docker compose down -v` — stop and wipe the database volume
`docker compose logs -f php` — tail PHP-FPM logs
`docker compose exec php sh` — shell into the PHP container
`docker compose exec db psql -U mockingbird mockingbird` — psql into the database

## Symfony console

`php bin/console cache:clear` — clear the app cache
`php bin/console debug:router` — list all routes
`php bin/console debug:container` — list services
`php bin/console debug:autowiring` — list autowirable types
`php bin/console make:controller` — generate a controller
`php bin/console make:entity` — generate/extend an entity

## Doctrine

`php bin/console doctrine:database:create --if-not-exists` — create the database
`php bin/console doctrine:database:create --env=test --if-not-exists` — create the test database
`php bin/console doctrine:migrations:diff` — generate a migration from entity changes
`php bin/console doctrine:migrations:migrate -n` — run pending migrations
`php bin/console doctrine:migrations:migrate prev -n` — roll back one migration
`php bin/console doctrine:schema:validate` — validate mapping vs schema

## Testing

`vendor/bin/phpunit` — full suite (Unit + Integration + E2E)
`vendor/bin/phpunit --testsuite Unit` — unit tests only
`vendor/bin/phpunit --testsuite Integration` — integration tests only (needs docker db)
`PATH="$PWD/drivers:$PATH" vendor/bin/phpunit --testsuite E2E` — Chromium E2E only (uses bdi's ChromeDriver)
`vendor/bin/bdi detect drivers` — install ChromeDriver matching local Chrome into drivers/
`vendor/bin/phpunit --coverage-html var/coverage` — HTML coverage report (needs Xdebug/pcov)

## CI (reproduce locally)

`cp .env.example .env` — same env CI starts from
`docker compose up -d` — provides the same Postgres CI uses
`php bin/console doctrine:database:create --env=test --if-not-exists` — test db (compose creates it already)
`vendor/bin/phpunit --testsuite Unit,Integration` — CI step 1
`vendor/bin/bdi detect drivers && PATH="$PWD/drivers:$PATH" PANTHER_NO_SANDBOX=1 vendor/bin/phpunit --testsuite E2E` — CI step 2
