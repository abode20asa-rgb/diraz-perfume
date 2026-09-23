window.DIRAZ_SUPABASE_URL = 'https://knqtuvcvqsupltbivkfb.supabase.co';
window.DIRAZ_SUPABASE_KEY = 'sb_publishable_z6JJkrQMzlmQV-iRwgCt1g__zvXXZk6';

window.DirazCloud = {
  async request(path, options = {}) {
    const response = await fetch(window.DIRAZ_SUPABASE_URL + '/rest/v1/' + path, {
      ...options,
      headers: {
        apikey: window.DIRAZ_SUPABASE_KEY,
        Authorization: 'Bearer ' + window.DIRAZ_SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return response.status === 204 ? null : response.json();
  },
  list(table, query = '') {
    return this.request(table + '?select=*' + query);
  },
  insert(table, rows) {
    return this.request(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'return=representation' } });
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
