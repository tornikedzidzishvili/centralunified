# Unified Platform

Internal platform for Central MFO.

## Quick Start (Docker)

```bash
# Clone and start
git clone https://github.com/tornikedzidzishvili/centralunified.git
cd centralunified
docker-compose up -d --build
```

Access:
- **Frontend**: `http://localhost:5173`
- **API**: `http://localhost:3000`
- **Default Login**: admin / admin123

## Production Deployment

### First Time Setup

```bash
# 1. Clone repository
git clone https://github.com/tornikedzidzishvili/centralunified.git
cd centralunified

# 2. Configure environment (create .env file)
cp .env.example .env
# Edit .env with your Gravity Forms credentials

# 3. Start services
docker-compose up -d --build
```

### Update Deployment

```bash
# Option 1: Use deploy script
./deploy.sh

# Option 2: Manual
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Database Management

The database is automatically managed:
- **On container start**: Schema is synced via `prisma db push`
- **Data persists**: PostgreSQL data stored in `postgres_data` volume
- **No manual migrations needed**: Schema changes are applied automatically

```bash
# Backup database
docker exec unified-platform-db pg_dump -U central unified_platform > backup.sql

# Restore database
docker exec -i unified-platform-db psql -U central unified_platform < backup.sql

# View database logs
docker logs unified-platform-db -f

# Connect to database
docker exec -it unified-platform-db psql -U central unified_platform
```

## Structure

- `server/`: Node.js Express backend with Prisma (PostgreSQL)
- `client/`: React Vite frontend with Tailwind CSS
- `docker-compose.yml`: Container orchestration

## Environment Variables

Create `.env` file in root directory:

1. Ensure Docker and Docker Compose are installed.
2. Run the application:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3000`

## Features

- **AD Integration**: Mocked in `server/index.js`. Configure `AD_URL` and `AD_DN` in `.env`.
- **User Management**: Admin can add users and assign branches.
- **Loan Applications**: Integrated with Gravity Forms via Webhook (`POST /api/webhook/gravity-forms`).
- **Role-based Access**:
  - **Admin**: Full access.
  - **Manager**: View loans for their branch.
  - **Credit Officer**: View assigned loans.

## Gravity Forms Integration

Configure your Gravity Forms to send a Webhook to:
`http://YOUR_SERVER_IP:3000/api/webhook/gravity-forms`

Payload should include:
- `entry_id`
- `first_name`
- `last_name`
- `email`
- `mobile`
- `branch`
