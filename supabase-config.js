window.DIRAZ_SUPABASE_URL = 'https://knqtuvcvqsupltbivkfb.supabase.co';
window.DIRAZ_SUPABASE_KEY = 'sb_publishable_z6JJkrQMzlmQV-iRwgCt1g__zvXXZk6';

window.DirazCloud = {
  SESSION_KEY: 'diraz_sb_session',

  // ── الجلسة (تسجيل دخول الأدمن) ──
  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); } catch (e) { return null; }
  },
  setSession(s) {
    try {
      if (s) localStorage.setItem(this.SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(this.SESSION_KEY);
    } catch (e) {}
  },
  hasSession() {
    const s = this.getSession();
    return !!(s && s.access_token && s.refresh_token);
  },
  async signIn(email, password) {
    const r = await fetch(window.DIRAZ_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: window.DIRAZ_SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw new Error(d.error_description || d.msg || 'login failed');
    this.setSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
    });
    return d;
  },
  signOut() { this.setSession(null); },
  async refresh() {
    const s = this.getSession();
    if (!s || !s.refresh_token) return false;
    try {
      const r = await fetch(window.DIRAZ_SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: window.DIRAZ_SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });
      const d = await r.json();
      if (!r.ok || !d.access_token) { this.setSession(null); return false; }
      this.setSession({
        access_token: d.access_token,
        refresh_token: d.refresh_token || s.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
      });
      return true;
    } catch (e) { return false; }
  },
  async token() {
    let s = this.getSession();
    if (s && s.access_token) {
      if (s.expires_at && s.expires_at - 60 < Math.floor(Date.now() / 1000)) {
        if (await this.refresh()) s = this.getSession(); else s = null;
      }
      if (s && s.access_token) return s.access_token;
      // كانت في جلسة أدمن بس انتهت ولا يمكن تجديدها: لا تكمل كزائر (كان يفشل الحذف بصمت)
      throw new Error('SESSION_EXPIRED');
    }
    return window.DIRAZ_SUPABASE_KEY;
  },

  // ── الطلبات ──
  async request(path, options = {}) {
    const send = async (tok) => fetch(window.DIRAZ_SUPABASE_URL + '/rest/v1/' + path, {
      ...options,
      headers: {
        apikey: window.DIRAZ_SUPABASE_KEY,
        Authorization: 'Bearer ' + tok,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    let response = await send(await this.token());
    if (response.status === 401 && this.hasSession()) {
      if (await this.refresh()) response = await send(await this.token());
      else throw new Error('SESSION_EXPIRED');
    }
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return null;
    const txt = await response.text();
    return txt ? JSON.parse(txt) : null;
  },
  rpc(name, args) {
    return this.request('rpc/' + name, { method: 'POST', body: JSON.stringify(args || {}) });
  },
  list(table, query = '') {
    return this.request(table + '?select=*' + query);
  },
  insert(table, rows) {
    return this.request(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'return=representation' } });
  },
  // إضافة بدون قراءة النتيجة (الزبائن يقدرون يضيفون طلب بس ما يقدرون يقرؤون)
  insertMin(table, rows) {
    return this.request(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'return=minimal' } });
  },
  upsert(table, rows) {
    return this.request(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
  },
  update(table, query, values) {
    return this.request(table + '?' + query, { method: 'PATCH', body: JSON.stringify(values), headers: { Prefer: 'return=representation' } });
  },
  remove(table, query) {
    return this.request(table + '?' + query, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }
};
