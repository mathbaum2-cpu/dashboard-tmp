const KNOWN_TYPES = ['steps', 'heartRate', 'sleep', 'exercise'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health-data') {
      if (request.method === 'POST') {
        const token = request.headers.get('X-Auth-Token');
        if (!env.HEALTH_SYNC_TOKEN || token !== env.HEALTH_SYNC_TOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return new Response('Invalid JSON', { status: 400 });
        }
        if (!body || !KNOWN_TYPES.includes(body.type)) {
          return new Response('Invalid or missing "type" (expected one of: ' + KNOWN_TYPES.join(', ') + ')', { status: 400 });
        }
        const entry = JSON.stringify({ type: body.type, value: body.value, updatedAt: Date.now() });
        await env.HEALTH_KV.put('health:' + body.type, entry);
        return new Response(entry, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'GET') {
        const result = {};
        await Promise.all(KNOWN_TYPES.map(async (type) => {
          const raw = await env.HEALTH_KV.get('health:' + type);
          result[type] = raw ? JSON.parse(raw) : null;
        }));
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname === '/api/app-data') {
      if (request.method === 'POST') {
        const token = request.headers.get('X-Auth-Token');
        if (!env.HEALTH_SYNC_TOKEN || token !== env.HEALTH_SYNC_TOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return new Response('Invalid JSON', { status: 400 });
        }
        if (!body || typeof body.data !== 'object' || typeof body.updatedAt !== 'number') {
          return new Response('Invalid payload (expected { data, updatedAt })', { status: 400 });
        }
        const payload = JSON.stringify({ data: body.data, updatedAt: body.updatedAt });
        await env.HEALTH_KV.put('app_state', payload);
        return new Response(payload, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'GET') {
        const raw = await env.HEALTH_KV.get('app_state');
        return new Response(raw || JSON.stringify({ data: {}, updatedAt: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Method not allowed', { status: 405 });
    }

    return env.ASSETS.fetch(request);
  }
};
