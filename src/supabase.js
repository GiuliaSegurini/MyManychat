const SUPABASE_URL = 'https://yywcqmowpsejlunzoyli.supabase.co';
const SUPABASE_KEY = 'sb_publishable_l6V6WAxjXN9qXZPbtN772w_AS0UKDX0';

export const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer !== undefined ? opts.prefer : 'return=representation',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};
