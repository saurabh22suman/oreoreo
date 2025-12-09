.PHONY: dev prod build stop clean logs

# Development
dev:
	docker-compose -f docker-compose.dev.yml up --build

dev-d:
	docker-compose -f docker-compose.dev.yml up --build -d

# Production
prod:
	docker-compose up --build -d

# Build only
build:
	docker-compose build

build-dev:
	docker-compose -f docker-compose.dev.yml build

# Stop containers
stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# Clean up
clean:
	docker-compose down -v --rmi local
	docker-compose -f docker-compose.dev.yml down -v --rmi local

# View logs
logs:
	docker-compose logs -f

logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f

# Restart
restart:
	docker-compose restart

restart-dev:
	docker-compose -f docker-compose.dev.yml restart
