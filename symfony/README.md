# 🐦 Mockingbird

**Cross-post once, publish everywhere — Facebook to X, Instagram, and Telegram.**

[![CI](https://github.com/ashrafbeshtawi/Mocking-Bird/actions/workflows/ci.yaml/badge.svg)](https://github.com/ashrafbeshtawi/Mocking-Bird/actions/workflows/ci.yaml)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)
![Symfony](https://img.shields.io/badge/Symfony-7.4%20LTS-000000?logo=symfony)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)

## What is this?

Mockingbird is a social media automation platform: connect your Facebook pages, X accounts, Instagram accounts, and Telegram channels, then publish to all of them at once — with publish history, analytics, and AI-powered content transformation. This directory is the **Symfony rewrite** of the original Next.js app (which lives at the repo root until cutover).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Symfony 7.4 LTS (PHP 8.4) |
| Database | PostgreSQL 18 |
| Templating | Twig |
| Containers | Docker Compose (PHP-FPM + Nginx + Postgres) |
| Tests | PHPUnit (unit + integration) · Panther/Chromium (E2E) |
| CI | GitHub Actions |

## Quickstart

```bash
cd symfony
cp .env.example .env
composer install
docker compose up -d --build
open http://localhost:8090
```

The stack boots with a `mockingbird` database plus a `mockingbird_test` database for the test suite (Postgres is exposed on host port **5440** to avoid clashing with a local server).

## Running tests

```bash
vendor/bin/phpunit --testsuite Unit          # unit tests
vendor/bin/phpunit --testsuite Integration   # HTTP + database tests (needs docker compose up)
vendor/bin/bdi detect drivers                            # once: install ChromeDriver for E2E
PATH="$PWD/drivers:$PATH" vendor/bin/phpunit --testsuite E2E   # Chromium end-to-end tests
```

## Project structure

```
symfony/
├── config/           # framework + bundle configuration
├── docker/           # php, nginx, postgres images & config
├── migrations/       # Doctrine migrations
├── public/           # web root (index.php, assets)
├── src/
│   ├── Controller/   # HTTP endpoints
│   └── Service/      # business logic
├── templates/        # Twig templates
└── tests/
    ├── Unit/         # pure PHP, no kernel
    ├── Integration/  # WebTestCase against the kernel + DB
    └── E2E/          # Panther-driven Chromium scenarios
```

The legacy PostgreSQL schema being ported lives in `../migrations/*.sql`.

## Contributing

- Conventional commits (`feat:`, `fix:`, `refactor:`, …)
- Every feature ships with tests in the same change — no exceptions
- All commands you'll ever need: see [CHEATSHEET.md](CHEATSHEET.md)

## License

Private — all rights reserved.
