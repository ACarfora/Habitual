const Sync = (() => {
    const API_URL = 'https://habitual-sync.alessio-carfora.workers.dev';
    const TOKEN_KEY = 'habitual_sync_token';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    function checkUrlToken() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) {
            setToken(token);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    async function pull(onUpdate) {
        const token = getToken();
        if (!token) { alert('Sync: no token found'); return; }

        try {
            const res = await fetch(API_URL, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) { alert('Sync: fetch failed, status ' + res.status); return; }

            const remote = await res.json();
            if (!remote.lastModified) { alert('Sync: no lastModified in remote'); return; }

            const local = Storage.exportAll();
            if (remote.lastModified > local.lastModified) {
                Storage.importAll(remote);
                if (onUpdate) onUpdate();
                alert('Sync: pulled and updated');
            } else {
                alert('Sync: local is newer or equal');
            }
        } catch (e) {
            alert('Sync: error — ' + e.message);
        }
    }

    async function push() {
        const token = getToken();
        if (!token) return;

        try {
            const data = Storage.exportAll();
            await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
        } catch (e) {
            // Offline or unreachable — will sync on next successful push
        }
    }

    return { pull, push, getToken, setToken, checkUrlToken };
})();
