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
        const payload = JSON.stringify({ ...body, updatedAt: Date.now() });
        await env.HEALTH_KV.put('latest', payload);
        return new Response(payload, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'GET') {
        const data = await env.HEALTH_KV.get('latest');
        return new Response(data || '{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Method not allowed', { status: 405 });
    }

    return env.ASSETS.fetch(request);
  }
};
