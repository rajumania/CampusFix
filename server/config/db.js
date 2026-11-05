import mongoose from 'mongoose';
import { env } from './env.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * Atlas credentials live in the connection string, so anything echoing it must
 * be scrubbed before it reaches a terminal or a log aggregator.
 */
export function redact(text = '') {
  return String(text).replace(/\/\/[^@\s]*@/g, '//***@');
}

/**
 * Safe facts about the connection string: host, port and database only. The
 * userinfo is reported as which problematic characters it contains, never the
 * value itself, because an unencoded ':' or '@' in the password is one of the
 * most common reasons a perfectly good Atlas URI fails to connect.
 */
export function inspectUri(uri = env.mongoUri) {
  const report = { parseable: false, host: null, database: null, needsEncoding: [] };

  // Inspect the raw userinfo first: a mis-encoded password is exactly what
  // makes URL parsing fail, so this must not depend on a successful parse.
  const at = uri.indexOf('@', uri.indexOf('//') + 2);
  if (at > 0) {
    const authority = uri.slice(uri.indexOf('//') + 2, at);
    const rawPassword = authority.split(':').slice(1).join(':');
    report.needsEncoding = [...new Set(rawPassword.split(''))]
      .filter((ch) => /[:@/?#[\]\s%]/.test(ch))
      .map((ch) => (ch === ' ' ? 'space' : ch));
  }

  let parsed;
  try {
    parsed = new URL(uri);
    report.parseable = true;
    report.host = parsed.hostname;
    report.database = parsed.pathname.replace(/^\//, '') || null;
  } catch {
    return report;
  }

  return report;
}

/**
 * Mongoose flattens the real reason into err.cause (and, for a replica set, an
 * AggregateError of per-server causes). Without walking that chain every failure
 * looks like "Could not connect to any servers" - which is exactly why a
 * credentials problem and an IP access-list problem are indistinguishable.
 */
export function describeConnectionFailure(err) {
  const causes = [];
  const walk = (node, depth = 0) => {
    if (!node || depth > 4) return;
    if (node.message) causes.push(String(node.message));
    if (node.code) causes.push(`code=${node.code}`);
    if (Array.isArray(node.errors)) node.errors.forEach((sub) => walk(sub, depth + 1));
    walk(node.cause, depth + 1);
  };
  walk(err);

  const text = causes.join(' ').toLowerCase();
  const originalName = err?.name || '';

  let code = 'UNKNOWN';
  let summary = 'The driver could not establish a usable connection.';

  if (/authentication failed|could not authenticate|invalid username|code=18|mongodbcredentialprovider/.test(text)) {
    code = 'AUTHENTICATION';
    summary =
      'Atlas reached the cluster but rejected the database user or password. Check MONGODB_USERNAME/MONGODB_PASSWORD inside MONGODB_URI, and that any reserved characters in the password are percent-encoded.';
  } else if (/enotfound|eai_again|getaddrinfo/.test(text)) {
    code = 'DNS_UNKNOWN_HOST';
    summary =
      'The cluster hostname could not be resolved. MONGODB_URI points at a cluster that does not exist (typo, or a deleted cluster), or this network blocks DNS.';
  } else if (/tls|certificate|ssl/.test(text)) {
    code = 'TLS';
    summary = 'TLS handshake failed - usually a proxy intercepting the connection or an unsupported driver version.';
  } else if (/connection (was )?closed|handshake|socketexception|read econnreset|econnrefused/.test(text)) {
    code = 'NETWORK_OR_IP_BLOCKED';
    summary =
      'TCP connected but Atlas closed it before completing the handshake. This is what Atlas does when the caller IP is not in Network Access, or when the cluster is configured for private/VPC access only.';
  } else if (/servertselection|server selection|timeout|timed out/.test(text + originalName.toLowerCase())) {
    code = 'SERVER_SELECTION_TIMEOUT';
    summary =
      'No Atlas member answered within serverSelectionTimeoutMS. Egress from this host to port 27017 is blocked, or the cluster is paused.';
  }

  return {
    code,
    summary,
    uri: inspectUri(),
    causes: causes.filter(Boolean).slice(0, 4).map((m) => redact(m).slice(0, 200)),
  };
}

/**
 * Renders the diagnosis as plain log lines - no credentials, no raw URI.
 */
export function logConnectionFailure(err) {
  const d = describeConnectionFailure(err);
  console.error(`[db] DIAGNOSIS code=${d.code}`);
  console.error(`[db] ${d.summary}`);
  console.error(
    `[db] target host=${d.uri.host ?? '(unparseable)'} database=${d.uri.database ?? '(from MONGODB_DB_NAME)'} parseable=${d.uri.parseable}`
  );
  if (d.uri.needsEncoding.length) {
    console.error(
      `[db] WARNING: the password in MONGODB_URI contains characters that must be percent-encoded: ${d.uri.needsEncoding.join(' ')} - Atlas will reject the URI as-is.`
    );
  }
  if (d.causes.length) console.error(`[db] underlying causes: ${d.causes.join(' | ')}`);
  return d;
}

export function databaseState() {
  const state = mongoose.connection.readyState;
  return {
    readyState: state,
    status: STATES[state] || 'unknown',
    connected: state === 1,
    database: mongoose.connection.name || env.mongoDatabase,
    host: mongoose.connection.host || null,
  };
}

export async function connectDB() {
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDatabase,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
  });

  console.log(`[db] MongoDB connected -> database "${conn.connection.name}" on ${conn.connection.host}`);
  return conn;
}

mongoose.connection.on('error', (err) => {
  console.error(`[db] Connection error: ${redact(err.message)}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected - Mongoose will attempt to reconnect automatically');
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected');
});
