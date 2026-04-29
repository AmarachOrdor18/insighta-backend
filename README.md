# Insighta Labs+ — Backend

## System Architecture
- Node.js + Express REST API
- In-memory data store (users, tokens, PKCE state)
- JWT access tokens (15min) + refresh tokens (7 days)
- Role-based access: admin and analyst
- API versioned under /v1

## Authentication Flow
1. Client calls GET /v1/auth/github/init — gets GitHub OAuth URL + state
2. User visits URL and authorizes on GitHub
3. GitHub redirects to /v1/auth/github/callback with code + state
4. Backend verifies PKCE, exchanges code for GitHub token, fetches user profile
5. Browser clients get HTTP-only cookies; CLI clients get tokens in JSON
6. Access token expires in 15min — use POST /v1/auth/refresh to rotate

## CLI Usage
See insighta-cli repo

## Token Handling
- Access token: JWT, 15min expiry, sent as Bearer header (CLI) or HTTP-only cookie (web)
- Refresh token: random 40-byte hex, 7 days, rotated on every use
- CSRF token: required for state-changing web requests via X-CSRF-Token header

## Role Enforcement
- First GitHub user to log in becomes admin, all others are analyst
- Admin can: export CSV, manage user roles, view all users
- Analyst can: browse and filter profiles
- Enforced via requireRole() middleware on every protected route

## Natural Language Parsing
- Query param: ?naturalLanguage=find available react developers in lagos
- Parser extracts: skills, availability, location, experience, role, rating
- Layered on top of existing filter system