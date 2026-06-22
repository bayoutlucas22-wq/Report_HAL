SHELL := /bin/sh
DOCKER_COMPOSE := docker compose
NPM := npm
NODE := node
APP_NAME := report-hal

.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Core"
	@echo "  setup           Install deps and prepare local data"
	@echo "  install         Install Node dependencies"
	@echo "  dev             Start the app locally"
	@echo "  build           Build the static bundle"
	@echo "  test            Run local checks"
	@echo ""
	@echo "Data"
	@echo "  treat           Normalize raw data to processed JSON"
	@echo "  ingest          Load data into MongoDB"
	@echo ""
	@echo "Containers"
	@echo "  start           Start with docker compose"
	@echo "  stop            Stop containers"
	@echo "  restart         Restart containers"
	@echo "  logs            Follow container logs"
	@echo "  shell           Open a shell in the app container"
	@echo "  clean           Remove containers and volumes"
	@echo ""
	@echo "Public study"
	@echo "  study           Print the public-study folder map"
	@echo "  audit           Show files that should stay private"
	@echo ""
	@echo "Remote"
	@echo "  deploy          Deploy to a remote host"
	@echo "  remote-logs     Tail remote logs"

.PHONY: setup
setup: install treat ingest

.PHONY: install
install:
	$(NPM) install

.PHONY: dev
dev:
	$(NPM) start

.PHONY: build
build:
	$(NPM) run build:static

.PHONY: test
test:
	$(NODE) test_db.js

.PHONY: treat
treat:
	$(NODE) treat_data.js

.PHONY: ingest
ingest:
	$(NODE) ingest_to_mongo.js

.PHONY: start
start:
	$(DOCKER_COMPOSE) up -d --build

.PHONY: stop
stop:
	$(DOCKER_COMPOSE) down

.PHONY: restart
restart: stop start

.PHONY: logs
logs:
	$(DOCKER_COMPOSE) logs -f

.PHONY: shell
shell:
	$(DOCKER_COMPOSE) exec app sh

.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down --rmi all --volumes --remove-orphans

.PHONY: study
study:
	@echo "Public study layout:"
	@echo "  public-study/      Abstracted, public-facing study docs"
	@echo "  public/            Frontend shell and demo assets"
	@echo "  src/               Reusable report-generation logic"
	@echo "  api/               Server and data access layer"
	@echo "  data/              Derived or sanitized data only"

.PHONY: audit
audit:
	@echo "Keep private:"
	@echo "  api/data/*.csv"
	@echo "  api/docs/**/*.pdf"
	@echo "  *.zip"
	@echo "  .env*"
	@echo "  deploy/*"

.PHONY: deploy
deploy:
	@if [ -z "$(TARGET)" ]; then echo "TARGET is required. Usage: make deploy TARGET=user@host [KEY=path/to/key]"; exit 1; fi
	chmod +x deploy/*.sh
	$(NPM) run deploy -- $(TARGET) $(KEY)

.PHONY: remote-logs
remote-logs:
	@if [ -z "$(TARGET)" ]; then echo "TARGET is required. Usage: make remote-logs TARGET=user@host [KEY=path/to/key]"; exit 1; fi
	ssh $(if $(KEY),-i $(KEY)) $(TARGET) "cd ~/$(APP_NAME) && docker compose -f deploy/docker-compose.prod.yml logs -f"
