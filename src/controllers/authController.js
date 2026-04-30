const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { users, refreshTokens, pkceStore } = require('../data/store');

const githubLogin = async (req, res) => {
  const { code, state, code_verifier, codeVerifier } = req.body;
  const verifier = code_verifier || codeVerifier;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // Exchange code for access token with GitHub
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
      code_verifier: verifier
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token, error } = tokenResponse.data;
    if (error) {
      return res.status(400).json({ error });
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const githubUser = userResponse.data;

    // Check if user exists, otherwise create
    let user = users.get(githubUser.id.toString());
    if (!user) {
      user = {
        id: githubUser.id.toString(),
        name: githubUser.name || githubUser.login,
        githubLogin: githubUser.login,
        role: 'analyst', // Default role
        createdAt: new Date().toISOString()
      };
      // For this task, let's make the first user an admin
      if (users.size === 0) user.role = 'admin';
      users.set(user.id, user);
    }

    // Generate JWTs
    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' });

    // Store refresh token
    refreshTokens.set(refreshToken, { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    // Set cookie for web portal
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      user,
      accessToken, // Return for CLI use
      refreshToken
    });
  } catch (err) {
    console.error('Login error:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

const refresh = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const session = refreshTokens.get(refreshToken);
  if (session.expiresAt < Date.now()) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const user = users.get(session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000
  });

  res.json({ accessToken });
};

const logout = (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out successfully' });
};

const getMe = (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: user });
};

const githubCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  // If this is a CLI flow, redirect the code to localhost immediately
  // Do NOT exchange it here, as the CLI will do the exchange itself (PKCE)
  if (state && state.startsWith('cli_')) {
    const port = state.split('_')[1] || '9876';
    return res.redirect(`http://localhost:${port}/callback?code=${code}&state=${state}`);
  }

  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token, error } = tokenResponse.data;
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
    }

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const githubUser = userResponse.data;

    let user = users.get(githubUser.id.toString());
    if (!user) {
      user = {
        id: githubUser.id.toString(),
        name: githubUser.name || githubUser.login,
        githubLogin: githubUser.login,
        role: 'analyst',
        createdAt: new Date().toISOString()
      };
      if (users.size === 0) user.role = 'admin';
      users.set(user.id, user);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000
    });

    // Redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/?login=success`);
  } catch (err) {
    console.error('Callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

module.exports = { githubLogin, githubCallback, refresh, logout, getMe };

