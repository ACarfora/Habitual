// Cloudflare Worker — Habitual sync API
// KV binding: HABITUAL_KV
// Environment variable: SYNC_TOKEN

const KV_KEY = 'habitual_data';
const ALLOWED_ORIGIN = 'https://habitual.themantraproject.com';

function corsHeaders(request) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '';
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };
}

function unauthorized(request) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders(request) });
}

function authenticate(request, env) {
    const auth = request.headers.get('Authorization');
    return auth === `Bearer ${env.SYNC_TOKEN}`;
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        if (!authenticate(request, env)) {
            return unauthorized(request);
        }

        try {
            if (request.method === 'GET') {
                const data = await env.HABITUAL_KV.get(KV_KEY, 'text');
                return new Response(data || '{}', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
                        ...corsHeaders(request),
                    },
                });
            }

            if (request.method === 'PUT') {
                const body = await request.text();
                await env.HABITUAL_KV.put(KV_KEY, body);
                return new Response('OK', { status: 200, headers: corsHeaders(request) });
            }
        } catch (e) {
            return new Response('Internal error', { status: 500, headers: corsHeaders(request) });
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) });
    },
};
