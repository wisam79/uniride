import fs from 'node:fs';

function parseEnvFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

async function callRpc(url, anonKey, jwt, rpc, payload = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { status: res.status, data };
}

async function signIn(url, anonKey, email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function main() {
  const env = parseEnvFile('.env');

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
  const driverEmail = process.env.SMOKE_DRIVER_EMAIL;
  const driverPassword = process.env.SMOKE_DRIVER_PASSWORD;
  const studentEmail = process.env.SMOKE_STUDENT_EMAIL;
  const studentPassword = process.env.SMOKE_STUDENT_PASSWORD;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
  }

  if (
    !adminEmail ||
    !adminPassword ||
    !driverEmail ||
    !driverPassword ||
    !studentEmail ||
    !studentPassword
  ) {
    throw new Error(
      'Set SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD/SMOKE_DRIVER_EMAIL/SMOKE_DRIVER_PASSWORD/SMOKE_STUDENT_EMAIL/SMOKE_STUDENT_PASSWORD',
    );
  }

  const adminJwt = await signIn(url, anonKey, adminEmail, adminPassword);
  const driverJwt = await signIn(url, anonKey, driverEmail, driverPassword);
  const studentJwt = await signIn(url, anonKey, studentEmail, studentPassword);

  const results = [];

  results.push({
    name: 'admin_get_dashboard_stats',
    ...(await callRpc(url, anonKey, adminJwt, 'get_dashboard_stats')),
  });
  results.push({
    name: 'student_get_dashboard_stats',
    ...(await callRpc(url, anonKey, studentJwt, 'get_dashboard_stats')),
  });
  results.push({
    name: 'driver_get_dashboard_stats',
    ...(await callRpc(url, anonKey, driverJwt, 'get_dashboard_stats')),
  });

  results.push({
    name: 'admin_get_slow_queries',
    ...(await callRpc(url, anonKey, adminJwt, 'get_slow_queries', { p_limit: 3 })),
  });
  results.push({
    name: 'student_get_slow_queries',
    ...(await callRpc(url, anonKey, studentJwt, 'get_slow_queries', { p_limit: 3 })),
  });

  for (const row of results) {
    console.log(`\n[${row.name}] status=${row.status}`);
    console.log(JSON.stringify(row.data, null, 2));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
