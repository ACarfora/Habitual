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
        if (!token) return;

        try {
            const res = await fetch(API_URL, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) return;

            const remote = await res.json();
            if (!remote.lastModified) return;

            const localModified = Storage.getLastModified();
            if (remote.lastModified > localModified) {
                Storage.importAll(remote);
                if (onUpdate) onUpdate();
            }
        } catch (e) {
            // Offline or unreachable — localStorage continues to work
        }
    }

    let pushTimer = null;

    function push() {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(doPush, 500);
    }

    async function doPush() {
        const token = getToken();
        if (!token) return;

        try {
            Storage.touchLastModified();
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
