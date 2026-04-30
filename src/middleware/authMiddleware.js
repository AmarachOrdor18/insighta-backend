const jwt = require('jsonwebtoken');
const { users } = require('../data/store');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Attach full user object from store to check role
    const user = users.get(decoded.id);
    if (!user) {
       // If not in store, we might be in a stateless mode or user was cleared.
       // For this task, we assume store persistence during session.
       // However, we should handle analysts vs admins.
       // If first time login, they get a role.
    } else {
        req.user.role = user.role;
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { verifyJWT, checkRole };
