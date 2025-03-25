# Changelog

## [1.0.0] - 2025-03-05

### Added

- Implemented session-based authentication using NestJS, Prisma ORM, and Redis
- Created Redis module for session storage and management
- Created session serializer for Passport integration
- Implemented role-based access control using guards
- Added session authentication guard for protecting routes
- Created protected user profile endpoint
- Added admin-only endpoints with role-based protection
- Created DTOs with validation for all authentication operations
- Implemented rate limiting for authentication endpoints
- Added environment variable configuration for Redis and sessions

### Security

- Implemented Argon2 for password hashing
- Added session-based authentication with Redis session storage
- Set up auto-expiring sessions with Redis TTL
- Secured cookies with httpOnly and secure flags
- Added CORS configuration for frontend integration
- Implemented role-based access control for API endpoints
- Implemented input validation using class-validator

### API Endpoints

- POST /auth/register - Register a new user
- POST /auth/login - Authenticate and create a session
- POST /auth/logout - Invalidate the current session
- POST /auth/refresh - Refresh session expiration
- GET /user/profile - Get authenticated user's profile
- GET /user/list - Get list of all users (admin only)

### Fixed

- Session expiry edge cases
- Password validation and hashing issues
- Redis connection error handling
- Session serialization issues

### Changed

- Updated authentication flow to use Redis sessions
- Improved error handling and validation messages
- Enhanced session management and security features
- Updated user model schema for better security

## [Unreleased]

### Added

- Extended User model in Prisma schema
- Created `auth` module with endpoints for registration, login, logout, and profile retrieval
- Implemented session-based authentication using Redis
- Added role-based access control using `Roles` decorator and `RolesGuard`
