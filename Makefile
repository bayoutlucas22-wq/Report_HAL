# Variables
DOCKER_COMPOSE = docker-compose
NPM = npm

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make start      - Start the application using docker-compose"
	@echo "  make stop       - Stop the application using docker-compose"
	@echo "  make restart    - Restart the application using docker-compose"
	@echo "  make logs       - View docker-compose logs"
	@echo "  make dev        - Run the application locally in development mode"
	@echo "  make install    - Install local dependencies"
	@echo "  make build      - Run the build script"
	@echo "  make clean      - Stop containers and remove docker images"

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

.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down --rmi all --volumes --remove-orphans
