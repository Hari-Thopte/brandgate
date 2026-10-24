import { getApiBaseUrl } from './apiConfig.js';

/** Typed error returned for API configuration, transport, HTTP, and response failures. */
export class ApiClientError extends Error {
  constructor(message, { kind, status = null, requestId, url, elapsedMs = 0 } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind || 'network';
    this.status = status;
    this.requestId = requestId || null;
    this.url = url || null;
    this.elapsedMs = elapsedMs;
  }
}

/** Send JSON requests with bounded timeouts, diagnostics, and safe GET-only retries. */
export async function requestApi(path, options = {}) {
  const {
    configuredUrl = '', isProduction = false, method = 'GET', body,
    headers = {}, timeoutMs = 10_000, fetchImpl = fetch,
    onConnection = () => {}, random = Math.random, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  } = options;
  const baseUrl = getApiBaseUrl(configuredUrl, isProduction);
  if (!baseUrl) throw new ApiClientError('The API URL is missing or invalid.', { kind: 'configuration', url: path });

  const url = `${baseUrl}${path}`;
  const requestId = globalThis.crypto?.randomUUID?.() || `bg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const attempts = method.toUpperCase() === 'GET' ? 3 : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const started = performance.now();
    let wakingTimer = setTimeout(() => onConnection({ status: 'waking', elapsedMs: Math.round(performance.now() - started) }), 4000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method,
        ...(body === undefined ? {} : { body }),
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), 'X-Request-ID': requestId, ...headers },
      });
      const elapsedMs = Math.round(performance.now() - started);
      const responseRequestId = response.headers?.get?.('x-request-id') || requestId;
      clearTimeout(wakingTimer);
      if (!response.ok) {
        let message = `API request failed with status ${response.status}.`;
        try { const payload = await response.json(); if (typeof payload.detail === 'string') message = payload.detail; }
        catch { /* The status is still useful when the response is not JSON. */ }
        const kind = response.status >= 400 && response.status < 500 ? 'http_client' : 'http_server';
        const error = new ApiClientError(message, { kind, status: response.status, requestId: responseRequestId, url, elapsedMs });
        if (attempt + 1 < attempts && response.status >= 500) {
          lastError = error;
          await sleep(180 * (2 ** attempt) + Math.round(random() * 180));
          continue;
        }
        onConnection({ status: 'offline', error });
        throw error;
      }
      let data;
      try { data = await response.json(); }
      catch { throw new ApiClientError('The API returned an invalid JSON response.', { kind: 'response', status: response.status, requestId: responseRequestId, url, elapsedMs }); }
      onConnection({ status: 'live', elapsedMs, requestId: responseRequestId });
      return data;
    } catch (error) {
      clearTimeout(wakingTimer);
      if (error instanceof ApiClientError && error.kind === 'http_client') throw error;
      const elapsedMs = Math.round(performance.now() - started);
      lastError = error instanceof ApiClientError ? error : new ApiClientError(
        controller.signal.aborted ? 'The API request timed out.' : 'The browser could not reach the API. Check its status and CORS settings.',
        { kind: controller.signal.aborted ? 'timeout' : 'network', requestId, url, elapsedMs },
      );
      if (attempt + 1 >= attempts) {
        onConnection({ status: 'offline', error: lastError });
        throw lastError;
      }
      await sleep(180 * (2 ** attempt) + Math.round(random() * 180));
    } finally {
      clearTimeout(timeout);
      clearTimeout(wakingTimer);
    }
  }
  throw lastError || new ApiClientError('The API request failed.', { kind: 'network', requestId, url });
}
