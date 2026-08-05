const crypto = require('crypto');

// SESSION_SECRET must be set as a Netlify environment variable.
// Falls back to a default only for local dev convenience — never rely on
// the fallback in production.
const SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

function sign(payload) {
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    return hmac.digest('hex');
}

// Creates a signed session token: base64(username:role:expiry):signature
function createSessionToken(username, role) {
    const expiry = Date.now() + SESSION_DURATION_MS;
    const payload = Buffer.from(`${username}:${role}:${expiry}`).toString('base64');
    const signature = sign(payload);
    return `${payload}.${signature}`;
}

// Verifies a session token. Returns { username, role } if valid, null otherwise.
function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = sign(payload);
    // Constant-time comparison to avoid timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    let decoded;
    try {
        decoded = Buffer.from(payload, 'base64').toString('utf8');
    } catch {
        return null;
    }

    const [username, role, expiryStr] = decoded.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (!username || !role || !expiry || Date.now() > expiry) return null;

    return { username, role };
}

// Parses the session cookie out of a raw Cookie header string
function getSessionFromCookieHeader(cookieHeader) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/(?:^|;\s*)blackout_session=([^;]+)/);
    if (!match) return null;
    return verifySessionToken(decodeURIComponent(match[1]));
}

function buildSessionCookie(token) {
    const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
    return `blackout_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function buildLogoutCookie() {
    return `blackout_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

module.exports = {
    createSessionToken,
    verifySessionToken,
    getSessionFromCookieHeader,
    buildSessionCookie,
    buildLogoutCookie
};
