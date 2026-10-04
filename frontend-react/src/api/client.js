// Fetch wrapper ported 1:1 from app.js lines 81–152.
// Same auth header logic, same 401 retry with silent Cognito refresh.
import { config } from '../config';

// Get/set tokens from localStorage — same keys as the old app
export function getTokens() {
  return {
    idToken: localStorage.getItem('farmbook_idtoken'),
    refreshToken: localStorage.getItem('farmbook_refreshtoken'),
    farmId: localStorage.getItem('farmbook_farmid'),
  };
}

export function setTokens({ idToken, refreshToken, farmId }) {
  if (idToken) localStorage.setItem('farmbook_idtoken', idToken);
  if (refreshToken) localStorage.setItem('farmbook_refreshtoken', refreshToken);
  if (farmId) localStorage.setItem('farmbook_farmid', farmId);
}

export function clearTokens() {
  localStorage.removeItem('farmbook_idtoken');
  localStorage.removeItem('farmbook_refreshtoken');
  localStorage.removeItem('farmbook_farmid');
  localStorage.removeItem('farmbook_batchid');
}

function cognitoRegion() {
  // Used to be parsed out of apiBase's hostname (execute-api.<region>.amazonaws.com)
  // -- broke silently the moment apiBase became a custom domain (api.trackfarm.cc)
  // instead of the raw API Gateway URL, which made every silent refresh below
  // fail and log users out as soon as their idToken naturally expired. Config
  // now carries it explicitly instead of this being inferred from a URL shape.
  return config.cognitoRegion || null;
}

async function refreshIdToken() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  const region = cognitoRegion();
  if (!region) return false;

  try {
    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: config.cognitoClientId,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.AuthenticationResult) return false;
    setTokens({ idToken: data.AuthenticationResult.IdToken });
    return true;
  } catch {
    return false;
  }
}

// Core API call — same logic as app.js api()
//
// OFFLINE BEHAVIOUR: this is a plain fetch with no queue. Offline, fetch
// rejects outright and the write is lost — the caller just surfaces an error
// toast. The blocking offline overlay was removed so connectivity loss no
// longer stops a farmer mid-entry, but that only unblocks the UI; it does not
// make writes survive being offline.
//
// The server half of offline sync already exists: POST /sync/batch takes a
// JSON Lines queue and applies each line idempotently on a client-generated
// entryId, so replaying a queue is safe. What's missing is the client half —
// persisting failed writes locally and flushing them to that endpoint on
// reconnect. src/pages/SyncPage.jsx is only a manual paste-the-payload tool
// and isn't routed.
export async function api(method, path, body, _isRetry = false) {
  const { idToken } = getTokens();
  const headers = { 'content-type': 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;

  const res = await fetch(config.apiBase + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_isRetry) {
    const refreshed = await refreshIdToken();
    if (refreshed) return api(method, path, body, true);
    clearTokens();
    window.location.reload();
    throw new Error('session expired');
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Raw fetch for sync endpoint (body is not JSON-stringified).
//
// This used to swallow non-OK responses and return the parsed body anyway,
// which is dangerous for the offline queue: a 401 or 500 would come back
// looking like a normal response with no `results`, and a careless caller
// could treat unsent entries as delivered. It now throws like api() does.
//
// It deliberately does NOT do api()'s clearTokens()+reload() dance when a
// refresh fails. The queue flush runs in the background, and reloading the
// page underneath someone mid-entry would be hostile. It throws instead, the
// flush keeps the queued entries, and the next attempt retries.
export async function apiRaw(method, path, rawBody, _isRetry = false) {
  const { idToken } = getTokens();
  const headers = {};
  if (idToken) headers.authorization = `Bearer ${idToken}`;

  const res = await fetch(config.apiBase + path, {
    method,
    headers,
    body: rawBody,
  });

  if (res.status === 401 && !_isRetry) {
    const refreshed = await refreshIdToken();
    if (refreshed) return apiRaw(method, path, rawBody, true);
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
