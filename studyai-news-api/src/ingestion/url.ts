const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'ref_src',
]);

function isIpv4Literal(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;

  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255);
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!normalized) return true;
  if (normalized.includes(':')) return true;
  if (isIpv4Literal(normalized)) return true;

  return normalized === 'localhost'
    || normalized === 'metadata.google.internal'
    || normalized === 'instance-data.ec2.internal'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || normalized.endsWith('.home.arpa');
}

export function validateAllowedTarget(rawUrl: string, allowedHosts: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('invalid_target_url');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const normalizedAllowedHosts = allowedHosts.map((host) => host.toLowerCase().replace(/\.$/, ''));

  if (url.protocol !== 'https:') throw new Error('https_required');
  if (url.username || url.password) throw new Error('url_credentials_forbidden');
  if (url.port && url.port !== '443') throw new Error('non_standard_port_forbidden');
  if (isBlockedHostname(hostname)) throw new Error('private_target_forbidden');
  if (!normalizedAllowedHosts.includes(hostname)) throw new Error('target_host_not_allowed');

  return url;
}

export function canonicalizeArticleUrl(
  rawUrl: string,
  feedUrl: string,
  allowedHosts: readonly string[],
): string {
  let resolved: URL;
  try {
    resolved = new URL(rawUrl, feedUrl);
  } catch {
    throw new Error('invalid_article_url');
  }

  validateAllowedTarget(resolved.toString(), allowedHosts);
  resolved.hash = '';
  resolved.hostname = resolved.hostname.toLowerCase();

  for (const key of [...resolved.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      resolved.searchParams.delete(key);
    }
  }

  resolved.searchParams.sort();
  return resolved.toString();
}
