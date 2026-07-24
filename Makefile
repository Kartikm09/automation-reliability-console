.PHONY: setup dev db-start db-reset db-test edge-test api-test web-test e2e lint build verify docker-build

setup:
	npm ci
	python3 -m venv services/api/.venv
	services/api/.venv/bin/pip install -e "services/api[dev]"

dev:
	docker compose up --build

db-start:
	npx supabase start

db-reset:
	npx supabase db reset

db-test:
	npx supabase test db

edge-test:
	npm run test:edge

api-test:
	services/api/.venv/bin/pytest services/api

web-test:
	npm test --workspace @arc/web

e2e:
	npm run test:e2e

lint:
	npm run format:check
	npm run lint
	npm run typecheck
	services/api/.venv/bin/ruff check services/api
	services/api/.venv/bin/mypy services/api/src

build:
	npm run build

docker-build:
	docker compose build

verify: lint db-test edge-test api-test web-test build docker-build
