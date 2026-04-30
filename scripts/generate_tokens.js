const jwt = require('jsonwebtoken');

const JWT_SECRET = 'insighta_jwt_super_secret_key_2026_do_not_share';
const JWT_REFRESH_SECRET = 'insighta_refresh_super_secret_key_2026_do_not_share';

const adminPayload = { id: 'admin_test_123', role: 'admin' };
const analystPayload = { id: 'analyst_test_456', role: 'analyst' };

const adminToken = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1y' });
const analystToken = jwt.sign(analystPayload, JWT_SECRET, { expiresIn: '1y' });
const refreshAdminToken = jwt.sign(adminPayload, JWT_REFRESH_SECRET, { expiresIn: '1y' });

console.log('--- ADMIN TOKEN ---');
console.log(adminToken);
console.log('\n--- ANALYST TOKEN ---');
console.log(analystToken);
console.log('\n--- REFRESH ADMIN TOKEN ---');
console.log(refreshAdminToken);
