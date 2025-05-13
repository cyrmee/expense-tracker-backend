# Expense Tracker Backend

A comprehensive expense tracker backend API built with NestJS, PostgreSQL, Prisma ORM, and Redis.

## Features

- **Authentication**: JWT authentication with Redis token validation and storage
- **User Management**: Create, read, update, and delete user profiles
- **Role-based Access Control**: Admin and regular user roles
- **Expense Management**: Track, categorize, and analyze expenses
- **Category Management**: Predefined and customizable expense categories
- **Money Source Handling**: Manage different sources like cash, bank accounts, credit cards
- **Data Analytics**: Expense trends, budget comparisons, and spending analysis
- **AI-Powered Features**: Natural language expense parsing and smart category suggestions using Google's Gemini AI

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

Update the `.env` file with your database, Redis, and API configurations:

```
DATABASE_URL="postgresql://postgres:your_password@localhost/expense-tracker-db"
PORT="5000"
FRONTEND_URL="*"
NODE_ENV=development

REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_URL="redis://localhost:6379"
APP_NAME="ExpenseTrackerApp"
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_very_strong_jwt_secret_key_here
JWT_ACCESS_EXPIRATION=15m
```

For AI features to work, you'll need to obtain a Google Gemini API key from the [Google AI Studio](https://makersuite.google.com/app/apikey).

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
  - The Swagger UI provides an "Authorize" button where you can enter your JWT token to authenticate all API requests

## Authentication

The application uses JWT (JSON Web Token) authentication for securing API endpoints:

### Authentication Flow

1. **Registration**: Create a new account using `/auth/register` endpoint
2. **Login**: Authenticate with your credentials at `/auth/login` to receive a JWT token
3. **Access Protected Resources**: Include the JWT token in the Authorization header of your requests:
   ```
   Authorization: Bearer your_jwt_token_here
   ```
4. **Token Refresh**: Use the `/auth/refresh-token` endpoint to obtain a new token before the current one expires
5. **Logout**: Use the `/auth/logout` endpoint to invalidate all active tokens

### Security Features

- JWT tokens are stored in Redis for validation and revocation capabilities
- Tokens can be revoked individually or all at once (during logout)
- JWT payload contains essential user information (id, email, name, isActive, isVerified)
- Invalid or expired tokens result in 401 Unauthorized responses

## AI-Powered Features

The application integrates with Google's Gemini AI model to provide intelligent expense processing capabilities:

### Natural Language Expense Parsing

Users can submit expense descriptions in natural language, and the AI will extract:

- The expense amount
- The date of the expense (supports both exact dates and relative terms like "yesterday" or "last week")
- The appropriate expense category
- Which money source was used
- Additional notes about the expense

Example: "Spent $45 at the grocery store yesterday using my credit card" will be automatically parsed into a structured expense entry.

### Smart Category Suggestions

When adding a new expense, the AI can suggest the most appropriate category based on the expense description, making categorization faster and more consistent.

These features require a valid Google Gemini API key to be configured in your `.env` file.

## Project Structure

- `src/` - Source code
  - `ai/` - AI service for natural language expense processing and category suggestions
  - `auth/` - Authentication module (login, register, JWT strategies)
  - `user/` - User management module
  - `expense/` - Expense tracking and management
  - `category/` - Expense categories handling
  - `money-source/` - Money sources management
  - `analytics/` - Data analysis and reporting
  - `prisma/` - Prisma service for database access
  - `redis/` - Redis module for JWT token management
  - `config/` - Application configuration
- `prisma/` - Prisma schema, migrations, and seed data

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
