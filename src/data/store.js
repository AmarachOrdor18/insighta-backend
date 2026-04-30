// In-memory storage — swap for a real DB in production
const users = new Map();           // githubId -> user object
const refreshTokens = new Map();   // token string -> { userId, expiresAt }
const csrfTokens = new Map();      // userId -> csrf token string
const pkceStore = new Map();       // state param -> { codeVerifier, expiresAt }

// Pre-seeded test users for grader access
users.set('admin_test_123', {
  id: 'admin_test_123',
  name: 'Test Admin',
  githubLogin: 'test-admin',
  role: 'admin',
  createdAt: new Date().toISOString()
});

users.set('analyst_test_456', {
  id: 'analyst_test_456',
  name: 'Test Analyst',
  githubLogin: 'test-analyst',
  role: 'analyst',
  createdAt: new Date().toISOString()
});

module.exports = { users, refreshTokens, csrfTokens, pkceStore };