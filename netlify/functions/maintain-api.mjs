export default async request => {
  try {
    const input = await request.json();
    const target = String(input?.target || '').replace(/\/$/, '');
    const path = String(input?.path || '');
    const method = String(input?.method || 'GET').toUpperCase();
    if (!/^https:\/\//i.test(target)) {
      return new Response(JSON.stringify({ error: 'Invalid Maintain AI API URL' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const url = `${target}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers();
    for (const [name, value] of Object.entries(input?.headers || {})) {
      if (value != null) headers.set(name, String(value));
    }
    const upstream = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(input?.body ?? {})
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Proxy request failed' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
};
