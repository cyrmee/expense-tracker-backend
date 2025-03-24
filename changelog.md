# Changelog

## [1.0.0] - 2025-03-05

### Added

- Implemented session-based authentication using NestJS, Prisma ORM, and Redis
- Created Redis module for session storage and management
- Added two-factor authentication (2FA) support using TOTP (Time-based One-Time Password)
- Implemented QR code generation for authenticator app setup
- Added backup codes functionality for 2FA recovery
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
- Added 2FA with TOTP authentication for enhanced security
- Implemented input validation using class-validator

### API Endpoints

- POST /auth/register - Register a new user
- POST /auth/login - Authenticate and create a session
- POST /auth/logout - Invalidate the current session
- POST /auth/2fa/generate - Generate 2FA secret and QR code
- POST /auth/2fa/enable - Enable 2FA for a user
- POST /auth/2fa/verify - Verify a 2FA code
- POST /auth/2fa/send - Simulate sending 2FA code via SMS/email
- POST /auth/refresh - Refresh session expiration
- GET /user/profile - Get authenticated user's profile
- GET /user/list - Get list of all users (admin only)

## [Unreleased]

### Added

- Extended User model in Prisma schema to include fields for two-factor authentication.
- Created `auth` module with endpoints for registration, login, 2FA, logout, and profile retrieval.
- Implemented session-based authentication using Redis.
- Added role-based access control using `Roles` decorator and `RolesGuard`.
