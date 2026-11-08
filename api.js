/* Shared API helper for Let's Trade ZM.
   Every request is one POST to the Apps Script web app URL (API_URL in config.js).
   The body is sent as plain text JSON on purpose: Apps Script cannot answer the
   browser's CORS "preflight" check, and text/plain avoids needing one. */

const TOKEN_KEYS = { customer: 'zm_token', admin: 'zm_admin_token' };

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function getToken(role) { try { return localStorage.getItem(TOKEN_KEYS[role]); } catch (e) { return null; } }
function setToken(role, token) { try { localStorage.setItem(TOKEN_KEYS[role], token); } catch (e) { /* private mode */ } }
function clearToken(role) { try { localStorage.removeItem(TOKEN_KEYS[role]); } catch (e) { /* ignore */ } }

/* Thin progress bar at the top of the page while a request is running
   (Apps Script usually takes 1 to 3 seconds, so people need a sign that something is happening). */
let _pending = 0;
function _bar(on) {
    let el = document.getElementById('zm-progress');
    if (!el) {
        el = document.createElement('div');
        el.id = 'zm-progress';
        el.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:100%;z-index:99999;display:none;' +
            'background:linear-gradient(90deg,transparent,#f59e0b,transparent);background-size:50% 100%;background-repeat:no-repeat;' +
            'animation:zmslide 1s linear infinite;';
        const style = document.createElement('style');
        style.textContent = '@keyframes zmslide{from{background-position:-50% 0}to{background-position:150% 0}}';
        document.head.appendChild(style);
        document.body.appendChild(el);
    }
    el.style.display = on ? 'block' : 'none';
}

/* role: 'customer' | 'admin' | null (public). Returns the response body, or throws Error(message).
   A 401 on an authenticated call clears the token and sends the user to the login page. */
async function api(path, { method = 'GET', body, role = null } = {}) {
    if (typeof API_URL === 'undefined' || !API_URL || API_URL.indexOf('PASTE_') === 0) {
        throw new Error('This site is not connected to its backend yet. Set API_URL in config.js.');
    }
    _pending++; _bar(true);
    let res;
    try {
        res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ method, path, token: role ? getToken(role) : null, body: body === undefined ? null : body }),
            redirect: 'follow'
        });
    } catch (e) {
        throw new Error('Cannot reach the server. Check your connection and try again.');
    } finally {
        if (--_pending === 0) _bar(false);
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!data || typeof data.status !== 'number') {
        throw new Error('Unexpected reply from the server. (If you are the owner: check that the web app is deployed with access set to "Anyone".)');
    }

    if (data.status === 401 && role) {
        clearToken(role);
        window.location.href = role === 'admin' ? 'admin.html' : 'login.html';
        throw new Error((data.body && data.body.error) || 'Please log in again.');
    }
    if (data.status >= 400) throw new Error((data.body && data.body.error) || 'Request failed (' + data.status + ').');
    return data.body;
}
