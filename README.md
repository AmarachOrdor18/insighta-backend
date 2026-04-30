# Insighta Labs+ Platform

Insighta Labs+ is a secure Profile Intelligence System designed for security researchers and HR analysts. It features a robust Node.js/Express backend, a modern React web portal, and a powerful CLI tool, all secured via GitHub OAuth with PKCE.

## 🏗️ System Architecture

The platform follows a distributed micro-services architecture:
- **Backend**: Node.js & Express hosted on **Railway**. Handles authentication, data persistence, and role-based access control.
- **Web Portal**: React & Vite hosted on **Vercel**. Provides a premium interface for managing profiles and exporting data.
- **CLI Tool**: Node.js-based terminal interface for researchers to interact with the platform directly from their workspace.

## 🔐 Authentication Flow (GitHub OAuth + PKCE)

The platform implements a high-security OAuth 2.0 flow with **Proof Key for Code Exchange (PKCE)**:
1. **Authorization**: The client (Web or CLI) generates a `code_verifier` and a `code_challenge`.
2. **Handshake**: The user is redirected to GitHub. The CLI uses a custom loopback server (`http://localhost:9876`) via a backend redirect to capture the authorization code.
3. **Verification**: The backend receives the `code` and the `code_verifier`. It exchanges these with GitHub for a user access token.
4. **Session**: Upon success, the backend generates two JWTs:
   - **Access Token**: Short-lived (15m), stored in an **HTTP-only, SameSite=None, Secure cookie** for the web.
   - **Refresh Token**: Long-lived (7d), used to silently rotate sessions.

## 🖥️ CLI Usage

The `insighta` CLI provides instant access to intelligence data:
- `insighta login`: Initiates the PKCE OAuth flow.
- `insighta logout`: Clears local credentials.
- `insighta profiles`: Lists all profiles with pagination.
- `insighta profiles --natural "react developers"`: Uses natural language search.
- `insighta profiles --page 2 --limit 5`: Controlled pagination.

## 🎟️ Token Handling Approach

- **Stateless Security**: All endpoints are protected by JWT verification.
- **Cross-Domain Support**: The backend is configured with CORS and specific cookie attributes to allow secure communication between the Railway API and Vercel Frontend.
- **CLI Storage**: The CLI stores tokens securely in the user's home directory (`~/.insighta/credentials.json`).

## 🛡️ Role Enforcement Logic

Roles are assigned during the first login and enforced via middleware:
- **Admin**: Full access, including profile management and sensitive data exports. The first user to log in is automatically promoted to Admin.
- **Analyst**: View-only access to intelligence data.
- **Middleware**: Every request passes through `authMiddleware.js` and `roleMiddleware.js`, which decode the JWT and verify the `role` claim before allowing access to specific routes.

## 🔍 Natural Language Parsing Approach

The search functionality uses a keyword-based extraction strategy:
1. **Normalization**: Queries are converted to lowercase and stripped of stop words.
2. **Term Matching**: The system scans profile names, logins, and roles for matches.
3. **Multi-field Search**: A single natural language query (e.g., "available react developers") is split into tokens and checked against the entire intelligence database to provide the most relevant results.

---

**Backend URL**: https://insighta-backend-production-50ca.up.railway.app
**Web Portal**: https://insighta-web-five-omega.vercel.app