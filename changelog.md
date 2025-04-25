# Changelog

## [1.2.0] - 2025-04-25

### Changed

- Removed refresh token encryption for improved performance and simplified token management
- Updated refresh token handling to use plaintext JWT tokens
- Simplified token validation process by removing encryption/decryption steps

### Security

- Maintained JTI (JWT ID) tracking for token revocation capabilities
- No security impact as refresh tokens were already protected by JWT signing

## [1.1.0] - 2025-04-18

### Changed

- Removed session-based authentication in favor of JWT-only authentication
- Eliminated cookie-based auth functionality for improved security and client compatibility
- Simplified Redis module to focus on token storage rather than session management
- Updated authentication flow to use access and refresh tokens exclusively
- Improved token revocation and validation through Redis JTI storage

### Security

- Enhanced token-based authentication with JWT for stateless authentication
- Implemented refresh token rotation for improved security
- Added token encryption for refresh tokens
- Added JTI (JWT ID) tracking for token revocation capabilities
- Maintained Argon2 for password hashing with enhanced security parameters

## [1.0.0] - 2025-03-05

### Added

- Implemented JWT authentication with Prisma ORM and Redis
- Created Redis module for token storage and management
- Implemented role-based access control using guards
- Added JWT authentication guard for protecting routes
- Created protected user profile endpoint
- Added admin-only endpoints with role-based protection
- Created DTOs with validation for all authentication operations
- Implemented rate limiting for authentication endpoints
- Added environment variable configuration for Redis and tokens

### Security

- Implemented Argon2 for password hashing
- Added JWT-based authentication with Redis token validation
- Set up auto-expiring tokens with configurable TTL
- Added CORS configuration for frontend integration
- Implemented role-based access control for API endpoints
- Implemented input validation using class-validator

### API Endpoints

- POST /auth/register - Register a new user
- POST /auth/login - Authenticate and return JWT tokens
- POST /auth/logout - Invalidate the current tokens
- POST /auth/refresh-access-token - Refresh an expired access token
- GET /user/profile - Get authenticated user's profile
- GET /user/list - Get list of all users (admin only)

### Fixed

- Token expiry edge cases
- Password validation and hashing issues
- Redis connection error handling
- Token management issues

### Changed

- Updated authentication flow to use JWT tokens with Redis validation
- Improved error handling and validation messages
- Enhanced token management and security features
- Updated user model schema for better security

## [Unreleased]

### Added

- Extended User model in Prisma schema
- Created `auth` module with endpoints for registration, login, logout, and profile retrieval
- Implemented JWT-based authentication using Redis for token validation
- Added role-based access control using `Roles` decorator and `RolesGuard`
