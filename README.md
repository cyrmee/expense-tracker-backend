# Expense Tracker Backend

A comprehensive expense tracker backend API built with NestJS, PostgreSQL, Prisma ORM, and Redis.

## Features

- **Authentication**: Session-based auth with Redis storage
- **User Management**: Create, read, update, and delete user profiles
- **Role-based Access Control**: Admin and regular user roles
- **Expense Management**: Track, categorize, and analyze expenses
- **Category Management**: Predefined and customizable expense categories
- **Money Source Handling**: Manage different sources like cash, bank accounts, credit cards
- **Data Analytics**: Expense trends, budget comparisons, and spending analysis

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation) package manager

For local setup, you'll also need:

- [PostgreSQL](https://www.postgresql.org/download/) database
- [Redis](https://redis.io/download) server

For Docker setup:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd expense-tracker-backend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your database and Redis configurations:

```
DATABASE_URL="postgresql://postgres:your_password@localhost/expense-tracker-db"
PORT="5000"
FRONTEND_URL="*"
NODE_ENV=development
COOKIE_NAME=expense_tracker
SESSION_SECRET=your-strong-secret-here
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_URL="redis://localhost:6379"
APP_NAME="ExpenseTrackerApp"
```

### 4. Database setup

#### Option 1: Manual Setup

Create a PostgreSQL database:

```bash
createdb expense-tracker-db
```

Run Prisma migrations to set up your database schema:

```bash
npx prisma migrate dev
```

Seed the database with initial data:

```bash
pnpm run prisma:seed
```

If you need to reset the database completely:

```bash
pnpm run db:reset
```

#### Option 2: Docker Setup

The project includes a `compose.yaml` file that sets up PostgreSQL and Redis containers for you.

1. Create a `.env.docker` file with the following content:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=expense-tracker-db
```

2. Start the Docker containers:

```bash
docker compose --env-file .env.docker up -d
```

3. Update your `.env` file to use the Docker services:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expense-tracker-db"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_URL="redis://localhost:6379"
```

4. Run database migrations and seed data:

```bash
pnpm run db:reset
```

This command will:

- Apply all Prisma migrations
- Seed the database with test users and sample expenses
- Generate Prisma client

## Running the Application

### Development mode

```bash
pnpm start:dev
```

### Debug mode

```bash
pnpm start:debug
```

## API Documentation

Once the application is running, you can access:

- REST API documentation at: `http://localhost:5000/api/docs` (Swagger UI)

## Project Structure

- `src/` - Source code
  - `auth/` - Authentication module (login, register)
  - `user/` - User management module
  - `expense/` - Expense tracking and management
  - `category/` - Expense categories handling
  - `money-source/` - Money sources management
  - `analytics/` - Data analysis and reporting
  - `prisma/` - Prisma service for database access
  - `redis/` - Redis module for session management
  - `config/` - Application configuration
- `prisma/` - Prisma schema, migrations, and seed data
- `test/` - End-to-end tests

## Default Users

After seeding the database (either manually or using Docker), you can log in with:

- Regular user:

  - Email: `john@example.com`
  - Password: `password123`

- Admin user:
  - Email: `jane@example.com`
  - Password: `password123`

## License

This project is licensed under the terms specified in the LICENSE file.
