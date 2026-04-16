# Variables
DOCKER_COMPOSE = docker compose
NPM = npm
NODE = node

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make setup      - Full backend setup (install + treat + ingest)"
	@echo "  make start      - Start the application using docker-compose"
	@echo "  make stop       - Stop the application using docker-compose"
	@echo "  make restart    - Restart the application using docker-compose"
	@echo "  make logs       - View docker-compose logs"
	@echo "  make dev        - Run the application locally in development mode"
	@echo "  make install    - Install local dependencies"
	@echo "  make build      - Run the build script"
	@echo "  make treat      - Precompute and process raw CSV data to JSON"
	@echo "  make ingest     - Ingest raw CSV data into MongoDB"
	@echo "  make test       - Verify data loading and connectivity"
	@echo "  make shell      - Open a shell inside the running app container"
	@echo "  make clean      - Stop containers and remove docker images"

# High-level setup
.PHONY: setup
setup: install treat ingest

# Docker targets
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

# Local development targets
.PHONY: dev
dev:
	$(NPM) start

.PHONY: install
install:
	$(NPM) install

.PHONY: build
build:
	$(NPM) run build:static

.PHONY: treat
treat:
	$(NODE) treat_data.js

.PHONY: ingest
ingest:
	$(NODE) ingest_to_mongo.js

.PHONY: test
test:
	$(NODE) test_db.js

.PHONY: shell
shell:
	$(DOCKER_COMPOSE) exec app sh

.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down --rmi all --volumes --remove-orphans

# Remote VPS Targets
.PHONY: deploy remote-logs
deploy:
	@if [ -z "$(TARGET)" ]; then echo "❌ Error: TARGET is required. Usage: make deploy TARGET=user@123.45.67.89 [KEY=path/to/key]"; exit 1; fi
	chmod +x deploy/*.sh
	npm run deploy -- $(TARGET) $(KEY)

remote-logs:
	@if [ -z "$(TARGET)" ]; then echo "❌ Error: TARGET is required. Usage: make remote-logs TARGET=user@123.45.67.89 [KEY=path/to/key]"; exit 1; fi
	ssh $(if $(KEY),-i $(KEY)) $(TARGET) "cd ~/cortex-hub && docker compose -f deploy/docker-compose.prod.yml logs -f"
