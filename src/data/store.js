// In-memory storage — swap for a real DB in production
const users = new Map();           // githubId -> user object
const refreshTokens = new Map();   // token string -> { userId, expiresAt }
const csrfTokens = new Map();      // userId -> csrf token string
const pkceStore = new Map();       // state param -> { codeVerifier, expiresAt }

module.exports = { users, refreshTokens, csrfTokens, pkceStore };