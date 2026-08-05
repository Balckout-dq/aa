document.addEventListener('DOMContentLoaded', () => {
    // --- SHOW CURRENT USER IN SIDEBAR & APPLY ROLE UI ---
    const currentUser = sessionStorage.getItem('blackout_user');
    const currentRole = sessionStorage.getItem('blackout_auth');

    // Show connected user in sidebar footer
    // (skip on admin.html, which manages its own #adminUserDisplay badge)
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && currentUser && !document.getElementById('adminUserDisplay')) {
        const userBadge = document.createElement('p');
        userBadge.style.cssText = 'color:#00ff41; margin-top:0.4rem; font-size:0.8rem;';
        userBadge.innerHTML = `> USER: <strong>${currentUser}</strong> [${currentRole}]`;
        sidebarFooter.insertBefore(userBadge, sidebarFooter.firstChild);

        // Add logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = '[ DÉCONNEXION ]';
        logoutBtn.style.cssText = 'margin-top:0.6rem; background:none; border:1px dashed rgba(255,51,102,0.5); color:rgba(255,51,102,0.8); font-family:"Share Tech Mono",monospace; font-size:0.75rem; cursor:pointer; padding:0.3rem 0.6rem; width:100%; transition:all 0.2s;';
        logoutBtn.onmouseover = () => { logoutBtn.style.color='#ff3366'; logoutBtn.style.borderColor='#ff3366'; };
        logoutBtn.onmouseout = () => { logoutBtn.style.color='rgba(255,51,102,0.8)'; logoutBtn.style.borderColor='rgba(255,51,102,0.5)'; };
        logoutBtn.onclick = logout;
        sidebarFooter.appendChild(logoutBtn);
    }

    // Hide admin tab for non-admin users on index.html
    const adminTabBtn = document.querySelector('[data-target="file-admin"]');
    if (adminTabBtn && currentRole !== 'admin') {
        adminTabBtn.style.display = 'none';
    }

    // --- MATRIX BACKGROUND EFFECT ---
    const canvas = document.getElementById('matrix-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+~}{[]|";
        const charsArray = matrixChars.split("");
        const fontSize = 14;
        let columns = canvas.width / fontSize;
        const drops = [];

        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        function drawMatrix() {
            ctx.fillStyle = "rgba(3, 3, 4, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#00ff41";
            ctx.font = fontSize + "px 'Share Tech Mono', monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = charsArray[Math.floor(Math.random() * charsArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        setInterval(drawMatrix, 35);

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            columns = canvas.width / fontSize;
            while (drops.length < columns) {
                drops.push(0);
            }
        });
    }

    // --- FOLDER & TAB NAVIGATION (static elements, e.g. admin.html) ---
    // On index.html the catalog folders/tabs are injected dynamically by
    // renderCatalog(), which calls bindFolderToggles()/bindFileTabs() itself.
    // Here we bind whatever static .folder-btn/.file-btn already exist in the DOM
    // (README, contact, admin tabs, or all of admin.html's static content).
    bindFolderToggles();
    bindFileTabs();

    // --- RANDOM GLITCH EFFECT GENERATOR ---
    const glitchClasses = ['glitch-active', 'crt-flicker-active', 'screen-shake'];
    const glitchableElements = document.querySelectorAll('h2, h3, p, .file-btn, .encryption-status, .author, .highlight');

    function triggerRandomGlitch() {
        if (glitchableElements.length === 0) return;
        const randomEl = glitchableElements[Math.floor(Math.random() * glitchableElements.length)];
        const randomGlitch = glitchClasses[Math.floor(Math.random() * glitchClasses.length)];

        randomEl.classList.add(randomGlitch);
        setTimeout(() => {
            randomEl.classList.remove(randomGlitch);
        }, Math.random() * 250 + 50);

        setTimeout(triggerRandomGlitch, Math.random() * 1200 + 300);
    }

    setTimeout(triggerRandomGlitch, 1000);
    setTimeout(triggerRandomGlitch, 1500);

    // --- BACKEND API INTEGRATION ---
    checkBackendStatus();

    if (document.getElementById('userListDiv')) {
        renderUserList();
        renderOrderList();
    }

    // Build the catalog (sidebar folders + product sheets) from the API
    if (document.getElementById('dynamicFolders')) {
        renderCatalog().then(() => startCatalogAutoRefresh());
    }

    // Load user's orders
    renderMyOrders();
});

const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

// Auto-redirect if opened as file:// instead of via server
if (location.protocol === 'file:' && document.getElementById('loginForm')) {
    setTimeout(() => {
        window.location.href = 'http://localhost:3000/login.html';
    }, 800);
}

// ============================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================
function guardPage() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const user = sessionStorage.getItem('blackout_user');
    const role = sessionStorage.getItem('blackout_auth');

    // Pages that don't need auth
    if (page === 'login.html' || page === '') return;

    // Not logged in → back to login
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // admin.html is admin-only
    if (page === 'admin.html' && role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    // index.html is user-only (admin should be on admin.html)
    if (page === 'index.html' && role === 'admin') {
        window.location.href = '/admin.html';
        return;
    }
}

// Run guard immediately (before DOM is built)
guardPage();

// Check DB Connection
async function checkBackendStatus() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        const data = await res.json();
        const statusEl = document.getElementById('dbStatus') || document.getElementById('adminDbStatus');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#00ff41;">● BACKEND DB : CONNECTÉE (${data.database})</span>`;
        }
    } catch (e) {
        console.warn('Backend server not reachable yet:', e);
        const statusEl = document.getElementById('dbStatus') || document.getElementById('adminDbStatus');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#ff3366;">● BACKEND DB : HORS LIGNE → <a href="http://localhost:3000/login.html" style="color:#ff3366;">localhost:3000</a></span>`;
        }
    }
}

// LOGIN VIA REST API
async function attemptLogin() {
    const uInput = document.getElementById('username');
    const pInput = document.getElementById('password');
    const err = document.getElementById('error-msg');
    if (!uInput || !pInput) return;

    const u = uInput.value.trim();
    const p = pInput.value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem('blackout_user', data.user.username);
            sessionStorage.setItem('blackout_auth', data.user.role);

            const adminTabBtn = document.querySelector('[data-target="file-admin"]');
            if (adminTabBtn && window.location.pathname.endsWith('index.html')) {
                adminTabBtn.click();
            } else {
                setTimeout(() => {
                    window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
                }, 400);
            }
            return;
        }
    } catch (e) {
        console.error('API Login Error:', e);
    }

    // Fallback error UI
    if (err) err.style.display = 'block';
    const container = document.querySelector('.login-container');
    if (container) container.classList.add('screen-shake');
    setTimeout(() => {
        if (err) err.style.display = 'none';
        if (container) container.classList.remove('screen-shake');
    }, 2000);
}

// LOGOUT
function logout() {
    sessionStorage.removeItem('blackout_user');
    sessionStorage.removeItem('blackout_auth');
    window.location.href = 'login.html';
}

// RENDER ADMIN USERS FROM DB
async function renderUserList() {
    const listDiv = document.getElementById('userListDiv');
    if (!listDiv) return;

    try {
        const res = await fetch(`${API_BASE}/users`);
        const users = await res.json();

        if (!users || users.length === 0) {
            listDiv.innerHTML = '<p>Aucun utilisateur dans la base de données backend.</p>';
            return;
        }

        let html = '<table class="admin-table"><tr><th>Nom d\'utilisateur</th><th>Rôle</th><th>Créé le</th><th>Action DB</th></tr>';
        users.forEach(u => {
            html += `<tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.role}</td>
                <td>${new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                <td>
                    ${u.username !== 'admin' ? `<button class="action-btn btn-reject" onclick="deleteUser('${u.username}')">Supprimer de la DB</button>` : '<em>Compte Système Root</em>'}
                </td>
            </tr>`;
        });
        html += '</table>';
        listDiv.innerHTML = html;
    } catch (e) {
        console.error('Error fetching users from DB:', e);
        listDiv.innerHTML = '<p style="color:#ff3366;">Erreur de connexion avec le serveur Backend DB.</p>';
    }
}

// ADD USER TO DB
async function handleAddUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    if (!username || !password) return;

    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (res.ok) {
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            renderUserList();
        } else {
            const data = await res.json();
            alert(`Erreur DB : ${data.error}`);
        }
    } catch (e) {
        alert('Erreur de connexion serveur.');
    }
}

// DELETE USER FROM DB
async function deleteUser(username) {
    if (!confirm(`Supprimer l'utilisateur "${username}" de la base de données ?`)) return;

    try {
        const res = await fetch(`${API_BASE}/users/${username}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            renderUserList();
        }
    } catch (e) {
        console.error('Failed to delete user:', e);
    }
}

// RENDER ADMIN ORDERS FROM DB
async function renderOrderList() {
    const orderDiv = document.getElementById('orderListDiv');
    if (!orderDiv) return;

    try {
        const res = await fetch(`${API_BASE}/orders`);
        const orders = await res.json();

        if (!orders || orders.length === 0) {
            orderDiv.innerHTML = '<p>Aucune commande enregistrée en base de données.</p>';
            return;
        }

        let html = '<table class="admin-table"><tr><th>ID</th><th>Client</th><th>Implant</th><th>Prix</th><th>Statut DB</th><th>Actions</th></tr>';
        orders.forEach(o => {
            html += `<tr>
                <td>#${o.id}</td>
                <td><strong>${o.username}</strong></td>
                <td>${o.implant_name}</td>
                <td>${o.price.toLocaleString()} €$</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td>
                    <button class="action-btn btn-approve" onclick="updateOrderStatus(${o.id}, 'Approved')">Valider</button>
                    <button class="action-btn btn-reject" onclick="updateOrderStatus(${o.id}, 'Rejected')">Refuser</button>
                </td>
            </tr>`;
        });
        html += '</table>';
        orderDiv.innerHTML = html;
    } catch (e) {
        console.error('Error fetching orders from DB:', e);
        orderDiv.innerHTML = '<p style="color:#ff3366;">Erreur d\'accès aux commandes DB.</p>';
    }
}

// UPDATE ORDER STATUS IN DB
async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            renderOrderList();
        }
    } catch (e) {
        console.error('Failed to update order status:', e);
    }
}

// ============================================================
// DYNAMIC CATALOG (sidebar folders + product sheets) FROM API
// ============================================================
let _lastCatalogSnapshot = null; // used to detect changes and skip needless re-renders

async function renderCatalog(isAutoRefresh = false) {
    const folderRoot = document.getElementById('dynamicFolders');
    const productRoot = document.getElementById('dynamicProducts');
    if (!folderRoot || !productRoot) return;

    try {
        const [catRes, implantRes] = await Promise.all([
            fetch(`${API_BASE}/categories`),
            fetch(`${API_BASE}/implants`)
        ]);
        const categories = await catRes.json();
        const implants = await implantRes.json();

        // Skip re-render entirely if nothing changed (avoids closing open
        // folders / losing the active tab on every poll)
        const snapshot = JSON.stringify({ categories, implants });
        if (isAutoRefresh && snapshot === _lastCatalogSnapshot) {
            return;
        }
        _lastCatalogSnapshot = snapshot;

        // Remember current UI state so we can restore it after re-render
        const openFolderNames = Array.from(document.querySelectorAll('.folder-btn.open'))
            .map(btn => btn.textContent.trim());
        const activeTabTarget = document.querySelector('.file-btn.active')?.getAttribute('data-target') || null;
        const activeTabLabel = document.querySelector('.file-btn.active')?.textContent || null;

        // Group implants by category id
        const byCategory = {};
        implants.forEach(imp => {
            const catId = imp.category || '_uncategorized';
            if (!byCategory[catId]) byCategory[catId] = [];
            byCategory[catId].push(imp);
        });

        let folderHtml = '';
        let productHtml = '';

        categories.forEach(cat => {
            const items = byCategory[cat.id] || [];

            // Sidebar folder + sub-files
            folderHtml += `
                <div class="folder">
                    <button type="button" class="folder-btn">${escapeHtml(cat.name)}</button>
                    <div class="sub-files">
                        ${items.map(imp => `<button type="button" class="file-btn" data-target="${escapeHtml(imp.id)}">${escapeHtml(imp.name)}</button>`).join('') || '<span style="padding:0.5rem 0.8rem; opacity:0.4; font-size:0.8rem;">(vide)</span>'}
                    </div>
                </div>`;

            // Product sheets for this category
            items.forEach(imp => {
                productHtml += buildProductSheet(imp);
            });
        });

        folderRoot.innerHTML = folderHtml;
        productRoot.innerHTML = productHtml;

        // Re-bind interactivity for the newly created elements
        bindFolderToggles();
        bindFileTabs();
        injectOrderButtons();

        // If the URL contains a hash like #f-neural-1, open that folder and
        // switch to that product tab directly (used by admin.html sidebar links)
        if (!isAutoRefresh && location.hash) {
            const targetId = location.hash.slice(1);
            const targetContent = document.getElementById(targetId);
            const targetBtn = document.querySelector(`[data-target="${targetId}"]`);
            if (targetContent && targetBtn) {
                document.querySelectorAll('.file-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.file-content').forEach(c => c.classList.remove('active'));
                targetBtn.classList.add('active');
                targetContent.classList.add('active');
                const currentFileName = document.getElementById('current-file-name');
                if (currentFileName) currentFileName.textContent = targetBtn.textContent;

                const parentSubFiles = targetBtn.closest('.sub-files');
                if (parentSubFiles) {
                    parentSubFiles.classList.add('open');
                    const parentFolderBtn = parentSubFiles.previousElementSibling;
                    if (parentFolderBtn) parentFolderBtn.classList.add('open');
                }
                targetBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }

        // Restore previously-open folders
        document.querySelectorAll('.folder-btn').forEach(btn => {
            if (openFolderNames.includes(btn.textContent.trim())) {
                btn.classList.add('open');
                const subFiles = btn.nextElementSibling;
                if (subFiles) subFiles.classList.add('open');
            }
        });

        // Restore previously-active tab if it still exists, otherwise fall
        // back to whatever is marked active by default (README)
        if (activeTabTarget) {
            const stillExists = document.getElementById(activeTabTarget);
            if (stillExists) {
                document.querySelectorAll('.file-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.file-content').forEach(c => c.classList.remove('active'));
                const btnToReactivate = document.querySelector(`[data-target="${activeTabTarget}"]`);
                if (btnToReactivate) btnToReactivate.classList.add('active');
                stillExists.classList.add('active');
                const currentFileName = document.getElementById('current-file-name');
                if (currentFileName && activeTabLabel) currentFileName.textContent = activeTabLabel;
            }
        }
    } catch (e) {
        console.error('Error loading catalog from DB:', e);
        if (!isAutoRefresh) {
            folderRoot.innerHTML = '<p style="padding:0.8rem 1rem; color:#ff3366; font-size:0.8rem;">Erreur de chargement du catalogue.</p>';
        }
    }
}

// Poll the backend every 5s and silently re-render only if data changed
function startCatalogAutoRefresh() {
    setInterval(() => {
        renderCatalog(true);
        renderMyOrders();
    }, 5000);
}


function buildProductSheet(imp) {
    const rarityColors = {
        'COMMUN': '#9e9e9e',
        'RARE': '#00bfff',
        'ÉPIQUE': '#b967ff',
        'LÉGENDAIRE': '#ffc107',
        'ICONIQUE': '#ff2d7b'
    };
    const rarityColor = rarityColors[imp.rarity] || '#00ff41';
    const price = Number(imp.price) || 0;
    const imageHtml = imp.imageUrl 
        ? `<img src="${escapeHtml(imp.imageUrl)}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${escapeHtml(imp.name)}">`
        : '';

    return `
        <div id="${escapeHtml(imp.id)}" class="file-content">
            <div class="product-layout">
                <div class="product-frame">
                    ${imageHtml}
                    <div class="corners"></div>
                </div>
                <div class="product-info">
                    <h3>◈ ${escapeHtml(imp.name)}</h3>
                    <p class="highlight"><strong>[Catégorie : ${escapeHtml(imp.category || '')}]</strong></p>
                    <p>${escapeHtml(imp.desc || '')}</p>
                    <br>
                    <p>Rareté : <strong style="color:${rarityColor};">${escapeHtml(imp.rarity || '')}</strong></p>
                    <p class="exploit"><strong>PRIX : ${price.toLocaleString()} €$</strong></p>
                </div>
            </div>
        </div>`;
}

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindFolderToggles() {
    document.querySelectorAll('.folder-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('open');
            const subFiles = btn.nextElementSibling;
            if (subFiles) subFiles.classList.toggle('open');
        });
    });
}

function bindFileTabs() {
    const fileBtns = document.querySelectorAll('.file-btn');
    const fileContents = document.querySelectorAll('.file-content');
    const currentFileName = document.getElementById('current-file-name');

    fileBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            fileBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (currentFileName) currentFileName.textContent = btn.textContent;

            fileContents.forEach(content => content.classList.remove('active'));

            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}
// ============================================================
// USER ORDERS (display only user's own orders)
// ============================================================
async function renderMyOrders() {
    const container = document.getElementById('myOrdersList');
    if (!container) return;

    const currentUser = sessionStorage.getItem('blackout_user');
    if (!currentUser) {
        container.innerHTML = '<p style="opacity:0.5;">Connectez-vous pour voir vos commandes.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/orders`);
        const allOrders = await res.json();

        // Filter orders for current user, sorted from most recent to oldest
        const userOrders = allOrders
            .filter(o => o.username === currentUser)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (userOrders.length === 0) {
            container.innerHTML = '<p style="opacity:0.5;">> Aucune commande en attente.</p>';
            return;
        }

        let html = '<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">';
        html += '<tr style="border-bottom:1px dashed var(--terminal-green-dim);">';
        html += '<th style="text-align:left; padding:0.8rem; color:var(--terminal-green);">ID</th>';
        html += '<th style="text-align:left; padding:0.8rem; color:var(--terminal-green);">IMPLANT</th>';
        html += '<th style="text-align:right; padding:0.8rem; color:var(--terminal-green);">PRIX</th>';
        html += '<th style="text-align:center; padding:0.8rem; color:var(--terminal-green);">STATUT</th>';
        html += '<th style="text-align:center; padding:0.8rem; color:var(--terminal-green);">DATE</th>';
        html += '</tr>';

        userOrders.forEach(order => {
            const statusColor = order.status === 'Approved' ? '#00ff41' : order.status === 'Pending' ? '#ffb347' : '#ff3366';
            const date = new Date(order.timestamp).toLocaleDateString('fr-FR');
            html += `<tr style="border-bottom:1px dashed rgba(0,255,65,0.1);">`;
            html += `<td style="padding:0.8rem; color:rgba(0,255,65,0.7);">#${order.id}</td>`;
            html += `<td style="padding:0.8rem;">${escapeHtml(order.implant_name)}</td>`;
            html += `<td style="text-align:right; padding:0.8rem; color:var(--terminal-green);">${Number(order.price).toLocaleString()} €$</td>`;
            html += `<td style="text-align:center; padding:0.8rem;"><span style="color:${statusColor}; font-weight:bold;">${escapeHtml(order.status)}</span></td>`;
            html += `<td style="text-align:center; padding:0.8rem; opacity:0.7; font-size:0.8rem;">${date}</td>`;
            html += `</tr>`;
        });
        html += '</table>';

        container.innerHTML = html;
    } catch (e) {
        console.error('Error loading user orders:', e);
        container.innerHTML = '<p style="color:#ff3366;">Erreur de chargement des commandes.</p>';
    }
}

// DYNAMICALLY INJECT "PASSER COMMANDE (DB)" BUTTONS ON CATALOG ITEMS
function injectOrderButtons() {
    const products = document.querySelectorAll('.product-info');
    products.forEach(prod => {
        const titleEl = prod.querySelector('h3');
        const priceEl = prod.querySelector('.exploit');
        if (titleEl && priceEl && !prod.querySelector('.btn-order-db')) {
            const implantName = titleEl.textContent.replace(/^[◈◎]\s*/, '').trim();
            const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
            const price = parseInt(priceText) || 0;

            const btn = document.createElement('button');
            btn.className = 'btn-order-db';
            btn.style.cssText = 'margin-top:15px; padding:10px 18px; background:#00ff41; color:#000; border:none; font-family:"Share Tech Mono", monospace; font-weight:bold; cursor:pointer; text-transform:uppercase; transition:0.2s;';
            btn.innerHTML = `> COMMANDER VIA DB (${price.toLocaleString()} €$)`;
            
            btn.addEventListener('click', async () => {
                const currentUser = sessionStorage.getItem('blackout_user') || 'Visiteur_Anonyme';
                try {
                    const res = await fetch(`${API_BASE}/orders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentUser, implant_name: implantName, price })
                    });
                    if (res.ok) {
                        btn.style.background = '#00e5ff';
                        btn.textContent = '✓ COMMANDE ENREGISTRÉE DANS LA DB!';
                        setTimeout(() => {
                            btn.style.background = '#00ff41';
                            btn.innerHTML = `> COMMANDER VIA DB (${price.toLocaleString()} €$)`;
                        }, 3500);
                    }
                } catch (e) {
                    alert('Erreur lors de l\'envoi de la commande à la DB backend.');
                }
            });

            prod.appendChild(btn);
        }
    });
}
