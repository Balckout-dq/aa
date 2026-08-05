const db = require('./utils/database');
const auth = require('./utils/auth');

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(statusCode, body, extraHeaders = {}) {
    return { statusCode, headers: { ...JSON_HEADERS, ...extraHeaders }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
    try {
        // event.path looks like /.netlify/functions/api/login or /api/login (with redirect)
        const path = event.path.replace(/^\/(\.netlify\/functions\/api|api)/, '') || '/';
        const segments = path.split('/').filter(Boolean); // e.g. ['orders', '123']
        const method = event.httpMethod;
        const body = event.body ? JSON.parse(event.body) : {};
        const cookieHeader = event.headers.cookie || event.headers.Cookie;
        const session = auth.getSessionFromCookieHeader(cookieHeader);

        // ==========================================
        // STATUS
        // ==========================================
        if (segments[0] === 'status' && method === 'GET') {
            return jsonResponse(200, {
                status: 'ONLINE',
                system: 'BLACKOUT_BACKEND_SERVER',
                database: 'CONNECTED (Netlify Blobs)',
                timestamp: new Date().toISOString()
            });
        }

        // ==========================================
        // LOGIN
        // ==========================================
        if (segments[0] === 'login' && method === 'POST') {
            const { username, password } = body;
            if (!username || !password) {
                return jsonResponse(400, { error: "Nom d'utilisateur et mot de passe requis." });
            }
            const user = await db.findUser(username, password);
            if (user) {
                const token = auth.createSessionToken(user.username, user.role);
                return jsonResponse(
                    200,
                    { success: true, user: { username: user.username, role: user.role } },
                    { 'Set-Cookie': auth.buildSessionCookie(token) }
                );
            }
            return jsonResponse(401, { error: 'Identifiants invalides.' });
        }

        // ==========================================
        // LOGOUT
        // ==========================================
        if (segments[0] === 'logout' && method === 'POST') {
            return jsonResponse(200, { success: true }, { 'Set-Cookie': auth.buildLogoutCookie() });
        }

        // ==========================================
        // SESSION CHECK (used by the frontend to know who's logged in)
        // ==========================================
        if (segments[0] === 'session' && method === 'GET') {
            if (!session) return jsonResponse(401, { error: 'Non connecté.' });
            return jsonResponse(200, { username: session.username, role: session.role });
        }

        // ==========================================
        // USERS
        // ==========================================
        if (segments[0] === 'users') {
            if (method === 'GET' && segments.length === 1) {
                const users = await db.getUsers();
                return jsonResponse(200, users);
            }
            if (method === 'POST' && segments.length === 1) {
                const { username, password, role } = body;
                if (!username || !password) return jsonResponse(400, { error: 'Champs manquants.' });
                try {
                    const newUser = await db.addUser(username, password, role || 'user');
                    return jsonResponse(201, newUser);
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
            if (method === 'DELETE' && segments.length === 2) {
                try {
                    await db.deleteUser(segments[1]);
                    return jsonResponse(200, { success: true, message: `Utilisateur ${segments[1]} supprimé.` });
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
        }

        // ==========================================
        // IMPLANTS
        // ==========================================
        if (segments[0] === 'implants') {
            if (method === 'GET' && segments.length === 1) {
                const implants = await db.getImplants();
                return jsonResponse(200, implants);
            }
            if (method === 'POST' && segments.length === 1) {
                const { id, name, category, rarity, price, desc, imageUrl } = body;
                if (!name || !category) return jsonResponse(400, { error: 'Champs manquants.' });
                const implant = await db.addImplant({
                    id: id || ('f-custom-' + Date.now()),
                    name, category,
                    rarity: rarity || 'COMMUN',
                    price: price || 0,
                    desc: desc || '',
                    imageUrl: imageUrl || ''
                });
                return jsonResponse(201, implant);
            }
            if (method === 'PUT' && segments.length === 2) {
                try {
                    const updated = await db.updateImplant(segments[1], body);
                    return jsonResponse(200, updated);
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
            if (method === 'DELETE' && segments.length === 2) {
                try {
                    await db.deleteImplant(segments[1]);
                    return jsonResponse(200, { success: true, message: `Implant ${segments[1]} supprimé.` });
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
        }

        // ==========================================
        // CATEGORIES
        // ==========================================
        if (segments[0] === 'categories') {
            if (method === 'GET' && segments.length === 1) {
                const categories = await db.getCategories();
                return jsonResponse(200, categories);
            }
            if (method === 'POST' && segments.length === 1) {
                const { id, name, description } = body;
                if (!id || !name) return jsonResponse(400, { error: 'ID et nom requis.' });
                try {
                    const cat = await db.addCategory({ id, name, description: description || '' });
                    return jsonResponse(201, cat);
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
            if (method === 'PUT' && segments.length === 2) {
                try {
                    const updated = await db.updateCategory(segments[1], body);
                    return jsonResponse(200, updated);
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
            if (method === 'DELETE' && segments.length === 2) {
                try {
                    await db.deleteCategory(segments[1]);
                    return jsonResponse(200, { success: true, message: `Catégorie ${segments[1]} supprimée.` });
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
        }

        // ==========================================
        // ORDERS
        // ==========================================
        if (segments[0] === 'orders') {
            if (method === 'GET' && segments.length === 1) {
                const orders = await db.getOrders();
                return jsonResponse(200, orders);
            }
            if (method === 'POST' && segments.length === 1) {
                const { username, implant_name, price } = body;
                if (!username || !implant_name) return jsonResponse(400, { error: 'Champs de commande invalides.' });
                const newOrder = await db.addOrder(username, implant_name, price || 0);
                return jsonResponse(201, newOrder);
            }
            if (method === 'PUT' && segments.length === 2) {
                try {
                    const updated = await db.updateOrderStatus(segments[1], body.status);
                    return jsonResponse(200, updated);
                } catch (err) {
                    return jsonResponse(400, { error: err.message });
                }
            }
        }

        return jsonResponse(404, { error: 'Route introuvable.' });
    } catch (err) {
        console.error('[API ERROR]', err);
        return jsonResponse(500, { error: err.message || 'Erreur serveur interne.' });
    }
};
