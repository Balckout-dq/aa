// Netlify Edge Function — runs on Deno, before the static file is served.
// Blocks direct access to admin.html / index.html without a valid session
// cookie, so the HTML is never sent to an unauthenticated visitor.

const SECRET = Deno.env.get('SESSION_SECRET') || 'dev-only-insecure-secret-change-me';

async function hmacSign(payload) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

async function verifySessionToken(token) {
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = await hmacSign(payload);
    if (!timingSafeEqual(signature, expectedSignature)) return null;

    let decoded;
    try {
        decoded = atob(payload);
    } catch {
        return null;
    }

    const [username, role, expiryStr] = decoded.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (!username || !role || !expiry || Date.now() > expiry) return null;

    return { username, role };
}

function getCookie(request, name) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export default async (request, context) => {
    const url = new URL(request.url);
    const page = url.pathname === '/' ? 'index.html' : url.pathname.split('/').pop();

    const token = getCookie(request, 'blackout_session');
    const session = await verifySessionToken(token);

    // Not logged in at all → send to login
    if (!session) {
        return Response.redirect(new URL('/login.html', url), 302);
    }

    // admin.html is admin-only → non-admins go to index.html
    if (page === 'admin.html' && session.role !== 'admin') {
        return Response.redirect(new URL('/index.html', url), 302);
    }

    // Valid session → let the request continue to the static file
    return context.next();
};

export const config = {
    path: ['/admin.html', '/index.html', '/']
};
