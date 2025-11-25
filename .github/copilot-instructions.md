# Central MFO Unified Platform - Development Instructions

## Project Overview
This is a full-stack loan application management platform for Central MFO integrating with WordPress Gravity Forms.

## Technology Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Active Directory (LDAP) with local password fallback
- **Containerization**: Docker Compose

## Development Commands

### Start Development Environment
```bash
docker compose up --build
```

### Access Services
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

### Database Migrations
```bash
docker compose exec server npx prisma db push
```

### Rebuild After Changes
```bash
docker compose restart server
# or for full rebuild:
docker compose up --build
```

## Key Features
- Gravity Forms sync (Form 4) from WordPress
- Role-based access (admin, manager, officer)
- Loan assignment workflow with approval requests
- CreditInfo verification status tracking
- Branch-based filtering for officers/managers
- Privacy-protected loan search
- Logo and favicon customization
- Password management for admins

## API Endpoints
- `POST /api/login` - User authentication
- `GET /api/loans` - Fetch loans with pagination
- `POST /api/sync` - Sync with Gravity Forms
- `GET/POST /api/settings` - Application settings
- `POST /api/users/:id/change-password` - Admin password change

## Environment Variables
Check `.env` file for configuration options including:
- Database connection
- WordPress API credentials
- AD/LDAP settings
