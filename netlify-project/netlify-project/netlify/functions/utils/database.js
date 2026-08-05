const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'blackout-db';
const DB_KEY = 'blackout_db';

const INITIAL_CATEGORIES = [
    { id: '01_neural', name: 'Neural', description: 'Implants neuronaux' },
    { id: '02_optique', name: 'Optique', description: 'Implants optiques' },
    { id: '03_bras', name: 'Bras', description: 'Implants de bras' },
    { id: '04_corps', name: 'Corps', description: 'Implants corporels' },
    { id: '05_systeme', name: 'Système', description: 'Implants système' }
];

const INITIAL_IMPLANTS = [
    { id: 'f-neural-1', category: '01_neural', name: 'Neural Link Pro X7', rarity: 'LÉGENDAIRE', price: 45000, desc: 'Interface neurale haut de gamme avec cryptage militaire et latence 0.3ms.' },
    { id: 'f-neural-2', category: '01_neural', name: 'Cortex Neural Base', rarity: 'COMMUN', price: 12000, desc: "Implant neural d'entrée de gamme, idéal pour débutant." },
    { id: 'f-neural-3', category: '01_neural', name: 'SynaptiCore v2 Ghost', rarity: 'ÉPIQUE', price: 38000, desc: 'Module neural furtif avec brouilleur de signature Arasaka.' },
    { id: 'f-opt-1', category: '02_optique', name: 'Kiroshi MK.3 Optiques', rarity: 'ÉPIQUE', price: 28000, desc: 'Vision nocturne HUD et reconnaissance faciale.' },
    { id: 'f-opt-2', category: '02_optique', name: 'Scanner Optique Mil-Spec', rarity: 'RARE', price: 15000, desc: 'Scanner longue portée (500m) avec analyse spectrale Militech.' },
    { id: 'f-opt-3', category: '02_optique', name: 'OmniLens Predator', rarity: 'LÉGENDAIRE', price: 55000, desc: 'Vision 360° et ralenti perceptif Kang Tao.' },
    { id: 'f-bras-1', category: '03_bras', name: 'Gorilla Arms MkIV', rarity: 'ÉPIQUE', price: 32000, desc: 'Prothèses hydrauliques à haute puissance de frappe.' },
    { id: 'f-bras-2', category: '03_bras', name: 'Mantis Blades v2', rarity: 'LÉGENDAIRE', price: 42000, desc: 'Lames de carbone escamotables sous pression.' },
    { id: 'f-bras-3', category: '03_bras', name: 'Monowire Tactique', rarity: 'RARE', price: 22000, desc: "Fil d'invisibilité thermique à rétractation automatique." },
    { id: 'f-corps-1', category: '04_corps', name: 'Subdermal Armor', rarity: 'COMMUN', price: 18000, desc: 'Plaques subdermiques par balles et chocs.' },
    { id: 'f-corps-2', category: '04_corps', name: 'Reflex Booster', rarity: 'ÉPIQUE', price: 34000, desc: 'Stimulateur adrénergique réflexe synaptique.' },
    { id: 'f-corps-3', category: '04_corps', name: 'Synth-Lungs Bio3', rarity: 'RARE', price: 21000, desc: 'Poumons synthétiques filtrant gaz toxiques et endurance.' },
    { id: 'f-sys-1', category: '05_systeme', name: 'Cyberdeck Arasaka v4', rarity: 'LÉGENDAIRE', price: 65000, desc: 'Deck de piratage corpo Arasaka de niveau militaire.' },
    { id: 'f-sys-2', category: '05_systeme', name: 'Daemon Deck X1', rarity: 'ÉPIQUE', price: 40000, desc: 'Processeur parallèle pour lancement de daemons simultanés.' },
    { id: 'f-sys-3', category: '05_systeme', name: 'NetPhantom ZeroDay', rarity: 'LÉGENDAIRE', price: 72000, desc: "Unité ZeroDay d'intrusion de pare-feu réseau." }
];

const INITIAL_USERS = [
    { username: 'Sp', password: 'Verdant', role: 'admin', created_at: new Date().toISOString() },
    { username: 'user', password: '1234', role: 'user', created_at: new Date().toISOString() },
    { username: 'V_Cyberpunk', password: 'nightcity', role: 'user', created_at: new Date().toISOString() }
];

const INITIAL_ORDERS = [
    { id: 101, username: 'V_Cyberpunk', implant_name: 'Kiroshi MK.3 Optiques', price: 28000, status: 'Approved', timestamp: new Date().toISOString() },
    { id: 102, username: 'user', implant_name: 'Gorilla Arms MkIV', price: 32000, status: 'Pending', timestamp: new Date().toISOString() }
];

function getInitialData() {
    return {
        users: INITIAL_USERS,
        implants: INITIAL_IMPLANTS,
        orders: INITIAL_ORDERS,
        categories: INITIAL_CATEGORIES
    };
}

function getBlobStore() {
    // Prefer explicit siteID/token from environment variables — this is
    // more reliable than relying on Netlify's automatic context injection,
    // which can fail to reach functions when a custom "Base directory" is
    // configured in the site's build settings.
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

    if (siteID && token) {
        return getStore({ name: STORE_NAME, siteID, token });
    }

    // Fallback: automatic configuration (works out of the box with
    // `netlify dev` locally, and on most standard Netlify deployments)
    return getStore(STORE_NAME);
}

async function loadData() {
    const store = getBlobStore();
    const raw = await store.get(DB_KEY, { type: 'json' });
    if (!raw) {
        const initial = getInitialData();
        await store.setJSON(DB_KEY, initial);
        return initial;
    }
    // Migrate: ensure categories exist for older blobs
    if (!raw.categories) {
        raw.categories = INITIAL_CATEGORIES;
        await store.setJSON(DB_KEY, raw);
    }
    return raw;
}

async function saveData(data) {
    const store = getBlobStore();
    await store.setJSON(DB_KEY, data);
}

// ============================================================
// USERS
// ============================================================
async function getUsers() {
    const data = await loadData();
    return data.users.map(u => ({ username: u.username, role: u.role, created_at: u.created_at }));
}

async function findUser(username, password) {
    const data = await loadData();
    return data.users.find(u => u.username === username && u.password === password);
}

async function addUser(username, password, role = 'user') {
    const data = await loadData();
    const existing = data.users.find(u => u.username === username);
    if (existing) throw new Error(`Utilisateur ${username} existe déjà.`);
    const newUser = { username, password, role, created_at: new Date().toISOString() };
    data.users.push(newUser);
    await saveData(data);
    return { username, role, created_at: newUser.created_at };
}

async function deleteUser(username) {
    const data = await loadData();
    const index = data.users.findIndex(u => u.username === username);
    if (index === -1) throw new Error(`Utilisateur ${username} introuvable.`);
    data.users.splice(index, 1);
    await saveData(data);
    return true;
}

// ============================================================
// IMPLANTS
// ============================================================
async function getImplants() {
    const data = await loadData();
    return data.implants;
}

async function addImplant(implant) {
    const data = await loadData();
    data.implants.push(implant);
    await saveData(data);
    return implant;
}

async function updateImplant(id, updates) {
    const data = await loadData();
    const imp = data.implants.find(item => item.id === id);
    if (!imp) throw new Error(`Implant ${id} introuvable.`);
    if (updates.name !== undefined) imp.name = updates.name;
    if (updates.category !== undefined) imp.category = updates.category;
    if (updates.rarity !== undefined) imp.rarity = updates.rarity;
    if (updates.price !== undefined) imp.price = updates.price;
    if (updates.desc !== undefined) imp.desc = updates.desc;
    if (updates.imageUrl !== undefined) imp.imageUrl = updates.imageUrl;
    await saveData(data);
    return imp;
}

async function deleteImplant(id) {
    const data = await loadData();
    const index = data.implants.findIndex(item => item.id === id);
    if (index === -1) throw new Error(`Implant ${id} introuvable.`);
    data.implants.splice(index, 1);
    await saveData(data);
    return true;
}

// ============================================================
// CATEGORIES
// ============================================================
async function getCategories() {
    const data = await loadData();
    return data.categories;
}

async function addCategory(cat) {
    const data = await loadData();
    const existing = data.categories.find(c => c.id === cat.id);
    if (existing) throw new Error(`Catégorie ${cat.id} existe déjà.`);
    data.categories.push(cat);
    await saveData(data);
    return cat;
}

async function updateCategory(id, updates) {
    const data = await loadData();
    const cat = data.categories.find(c => c.id === id);
    if (!cat) throw new Error(`Catégorie ${id} introuvable.`);
    if (updates.name !== undefined) cat.name = updates.name;
    if (updates.description !== undefined) cat.description = updates.description;
    await saveData(data);
    return cat;
}

async function deleteCategory(id) {
    const data = await loadData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`Catégorie ${id} introuvable.`);
    data.categories.splice(index, 1);
    await saveData(data);
    return true;
}

// ============================================================
// ORDERS
// ============================================================
async function getOrders() {
    const data = await loadData();
    return data.orders;
}

async function addOrder(username, implant_name, price) {
    const data = await loadData();
    const newOrder = {
        id: Date.now(),
        username,
        implant_name,
        price,
        status: 'Pending',
        timestamp: new Date().toISOString()
    };
    data.orders.push(newOrder);
    await saveData(data);
    return newOrder;
}

async function updateOrderStatus(orderId, status) {
    const data = await loadData();
    const order = data.orders.find(o => o.id == orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable.`);
    order.status = status;
    await saveData(data);
    return order;
}

module.exports = {
    getUsers, findUser, addUser, deleteUser,
    getImplants, addImplant, updateImplant, deleteImplant,
    getCategories, addCategory, updateCategory, deleteCategory,
    getOrders, addOrder, updateOrderStatus
};
