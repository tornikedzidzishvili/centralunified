# Unified Platform

Internal platform for Central MFO.

## Structure

- `server/`: Node.js Express backend with Prisma (SQLite) and LDAP integration.
- `client/`: React Vite frontend with Tailwind CSS.

## Setup

### Backend

1. Navigate to `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize Database:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. Start Server:
   ```bash
   node index.js
   ```
   Server runs on `http://localhost:3000`.

### Frontend

1. Navigate to `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Development Server:
   ```bash
   npm run dev
   ```
   Client runs on `http://localhost:5173`.

## Docker Setup

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
