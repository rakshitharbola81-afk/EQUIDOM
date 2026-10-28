const express = require('express');
const router = express.Router();
const path = require('path');
const dotenv = require('dotenv');

// Helper to ensure fresh credentials even if .env was just modified
function getGithubCredentials() {
  dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });
  return {
    clientId: (process.env.GITHUB_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
    callbackUrl: (process.env.GITHUB_CALLBACK_URL || 'http://localhost:5001/api/auth/github/callback').trim(),
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5174').trim().replace(/\/$/, '')
  };
}

/**
 * Initiates GitHub OAuth flow
 * GET /api/auth/github
 */
router.get('/github', (req, res) => {
  const { clientId, callbackUrl, frontendUrl } = getGithubCredentials();
  const scope = 'repo,read:user,user:email';

  // Automatically detect client origin (e.g. http://localhost:5174)
  let clientOrigin = frontendUrl;
  if (req.query.origin) {
    clientOrigin = req.query.origin.trim().replace(/\/$/, '');
  } else if (req.headers.referer) {
    try {
      const parsed = new URL(req.headers.referer);
      clientOrigin = `${parsed.protocol}//${parsed.host}`;
    } catch (_) {}
  }

  if (!clientId) {
    return res.redirect(`${clientOrigin}/audit-setup?auth_error=GITHUB_CLIENT_ID_is_not_configured_in_backend_env._Please_set_GITHUB_CLIENT_ID_in_backend/.env_or_enter_a_Personal_Access_Token`);
  }

  // Pass the client origin in the OAuth state parameter so GitHub returns it to callback
  const state = encodeURIComponent(clientOrigin);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(githubAuthUrl);
});

/**
 * Handles GitHub OAuth redirect callback
 * GET /api/auth/github/callback
 */
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const { clientId, clientSecret, callbackUrl, frontendUrl } = getGithubCredentials();

  let returnOrigin = frontendUrl;
  if (state) {
    try {
      returnOrigin = decodeURIComponent(state).replace(/\/$/, '');
    } catch (_) {}
  }

  if (!code) {
    return res.redirect(`${returnOrigin}/audit-setup?auth_error=No_code_received`);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      const errMsg = tokenData.error_description || tokenData.error || 'Authentication_failed';
      return res.redirect(`${returnOrigin}/audit-setup?auth_error=${encodeURIComponent(errMsg)}`);
    }

    // Successfully retrieved access_token; redirect to frontend on the exact port where request started
    res.redirect(`${returnOrigin}/audit-setup?token=${encodeURIComponent(tokenData.access_token)}`);
  } catch (error) {
    console.error('GitHub OAuth callback exception:', error);
    res.redirect(`${returnOrigin}/audit-setup?auth_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Returns GitHub connection status and profile if authenticated
 * GET /api/auth/status
 */
router.get('/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (!token) {
    return res.json({ connected: false });
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'EquiDom-Accessibility-Auditor'
      }
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      return res.json({
        connected: true,
        user: {
          login: userData.login,
          name: userData.name || userData.login,
          avatar_url: userData.avatar_url,
          html_url: userData.html_url
        }
      });
    }

    return res.json({ connected: false });
  } catch {
    return res.json({ connected: false });
  }
});

module.exports = router;
