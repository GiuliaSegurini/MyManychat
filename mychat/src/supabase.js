const SUPABASE_URL = 'https://yywcqmowpsejlunzoyli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5d2NxbW93cHNlamx1bnpveWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2MDcyOTcsImV4cCI6MjA2MTE4MzI5N30.BknCR4SqKqTT-LuB7n13FmRXU4l0HKMpTWDiBaCXarU';

export const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};
