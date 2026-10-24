export function getApiBaseUrl(configuredUrl, isProduction) {
  const value = String(configuredUrl || '').trim().replace(/\/+$/, '');
  if (value) {
    try {
      const parsed = new URL(value);
      const localHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      if (isProduction && (parsed.protocol !== 'https:' || localHost)) return '';
      return value;
    } catch {
      return '';
    }
  }
  return isProduction ? '' : 'http://127.0.0.1:8000';
}
