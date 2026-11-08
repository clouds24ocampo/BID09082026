// Minimal in-memory stand-in for the Supabase HTTP API (auth, PostgREST sync_records + sync_push, storage).
// Test tooling only: lets the e2e suite run the real app and the real supabase-js client with no cloud account.
// Usage as a module: const mock = await startMockSupabase(54321); ... await mock.close();
import http from 'node:http';
import crypto from 'node:crypto';

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const jwt = (uid, email) =>
  `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: uid, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.mock`;
const uidOf = (req) => {
  const t = (req.headers.authorization || '').replace(/^Bearer /i, '');
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).sub; } catch { return null; }
};

export async function startMockSupabase(port = 54321) {
  const users = new Map(); // email -> { id, password, meta }
  const rows = new Map(); // `${uid}\n${key}` -> row
  const files = new Map(); // `${uid}/...path` -> { bytes, type }
  let seq = 0;
  const stats = { pushes: 0, offline: false };

  const session = (u) => ({
    access_token: jwt(u.id, u.email), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: crypto.randomUUID(),
    user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.meta, app_metadata: {}, created_at: new Date().toISOString() },
  });

  const readBody = (req) => new Promise((resolve) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); });
  const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

  const server = http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('access-control-expose-headers', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (stats.offline) { req.destroy(); return; }

    const url = new URL(req.url, `http://localhost:${port}`);
    const p = url.pathname;
    const body = await readBody(req);

    // ---- auth ----
    if (p === '/auth/v1/signup') {
      const { email, password, data } = JSON.parse(body.toString());
      if (users.has(email)) return json(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      const u = { id: crypto.randomUUID(), email, password, meta: data || {} };
      users.set(email, u);
      return json(res, 200, session(u));
    }
    if (p === '/auth/v1/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const { email, password } = JSON.parse(body.toString());
        const u = users.get(email);
        if (!u || u.password !== password) return json(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        return json(res, 200, session(u));
      }
      if (grant === 'refresh_token') {
        const u = [...users.values()][0];
        return u ? json(res, 200, session(u)) : json(res, 400, { msg: 'invalid refresh token' });
      }
    }
    if (p === '/auth/v1/logout') { res.writeHead(204); return res.end(); }
    if (p === '/auth/v1/user') {
      const u = [...users.values()].find((x) => x.id === uidOf(req));
      return u ? json(res, 200, session(u).user) : json(res, 401, { msg: 'invalid JWT' });
    }

    const uid = uidOf(req);
    if (!uid) return json(res, 401, { message: 'JWT required' });

    // ---- sync_push (same last-write-wins rule as the SQL function) ----
    if (p === '/rest/v1/rpc/sync_push' && req.method === 'POST') {
      stats.pushes++;
      const { records } = JSON.parse(body.toString());
      let accepted = 0;
      for (const r of records) {
        const k = `${uid}\n${r.key}`;
        const cur = rows.get(k);
        if (cur && !(r.client_updated_ms > cur.client_updated_ms)) continue;
        rows.set(k, { key: r.key, tenant_id: r.tenant_id, deleted: !!r.deleted, payload: r.payload ?? null, client_updated_ms: r.client_updated_ms, server_seq: ++seq });
        accepted++;
      }
      return json(res, 200, accepted);
    }

    // ---- sync_records reads / deletes ----
    if (p === '/rest/v1/sync_records') {
      const mine = [...rows.entries()].filter(([k]) => k.startsWith(`${uid}\n`)).map(([, v]) => v);
      if (req.method === 'GET') {
        let out = mine;
        const gt = url.searchParams.get('server_seq');
        if (gt?.startsWith('gt.')) out = out.filter((r) => r.server_seq > Number(gt.slice(3)));
        const like = url.searchParams.get('key');
        if (like?.startsWith('like.')) { const pre = like.slice(5).replace(/%$/, ''); out = out.filter((r) => r.key.startsWith(pre)); }
        out = out.sort((a, b) => a.server_seq - b.server_seq);
        const lim = url.searchParams.get('limit');
        if (lim) out = out.slice(0, Number(lim));
        return json(res, 200, out);
      }
      if (req.method === 'DELETE') {
        for (const k of [...rows.keys()]) if (k.startsWith(`${uid}\n`)) rows.delete(k);
        res.writeHead(204); return res.end();
      }
    }

    // ---- storage ----
    const m = p.match(/^\/storage\/v1\/object\/(?:authenticated\/)?vault\/(.+)$/);
    if (m) {
      const path = decodeURIComponent(m[1]);
      if (!path.startsWith(`${uid}/`)) return json(res, 403, { message: 'forbidden' });
      if (req.method === 'POST' || req.method === 'PUT') {
        files.set(path, { bytes: body, type: req.headers['content-type'] || 'application/octet-stream' });
        return json(res, 200, { Id: crypto.randomUUID(), Key: `vault/${path}` });
      }
      if (req.method === 'GET') {
        const f = files.get(path);
        if (!f) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
        res.writeHead(200, { 'content-type': f.type }); return res.end(f.bytes);
      }
    }
    if (p === '/storage/v1/object/vault' && req.method === 'DELETE') {
      for (const path of JSON.parse(body.toString()).prefixes || []) files.delete(path);
      return json(res, 200, []);
    }
    if (p === '/storage/v1/object/list/vault' && req.method === 'POST') {
      const { prefix } = JSON.parse(body.toString());
      const pre = prefix.endsWith('/') ? prefix : `${prefix}/`;
      const names = new Set();
      for (const f of files.keys()) if (f.startsWith(pre)) names.add(f.slice(pre.length).split('/')[0]);
      return json(res, 200, [...names].map((name) => ({ name })));
    }

    return json(res, 404, { message: `mock: no route for ${req.method} ${p}` });
  });

  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${port}`,
    stats,
    rows: () => [...rows.values()],
    /** Insert a record as if the server returned it (used to prove clients reject foreign data). */
    inject: (email, rec) => { rows.set(`${users.get(email).id}\n${rec.key}`, { deleted: false, payload: null, ...rec, server_seq: ++seq }); },
    files: () => [...files.keys()],
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('mock-supabase.mjs')) {
  const mock = await startMockSupabase(Number(process.env.PORT) || 54321);
  console.log(`Mock Supabase listening at ${mock.url}`);
}
