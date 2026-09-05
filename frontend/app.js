// Plain JS, no build step — v1 of the product frontend
// (docs/10-build-plan.md §8): simple and minimalistic on purpose, meant
// to be replaced by a more sophisticated design later. Doubles as the
// technical test console for the scaffolded API right now
// (docs/10-build-plan.md §10) — every API call is echoed into the debug
// panel so you can see exactly what the backend returned while clicking
// through it.

const state = {
  idToken: localStorage.getItem('farmbook_idtoken') || null,
  refreshToken: localStorage.getItem('farmbook_refreshtoken') || null,
  farmId: localStorage.getItem('farmbook_farmid') || null,
  session: null,
  email: null,
  batches: [],
  currentBatchId: localStorage.getItem('farmbook_batchid') || null,
};

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function logDebug(method, path, status, body) {
  const el = document.createElement('div');
  el.className = 'debug-entry' + (status >= 400 ? ' debug-error' : '');
  const time = new Date().toLocaleTimeString();
  el.innerHTML =
    `<div class="debug-line"><b>${method}</b> ${escapeHtml(path)} &rarr; <b>${status}</b>` +
    `<span class="debug-time">${time}</span></div>` +
    `<pre>${escapeHtml(JSON.stringify(body, null, 2))}</pre>`;
  $('debug-log').prepend(el);
}

$('debug-clear-btn').addEventListener('click', () => { $('debug-log').innerHTML = ''; });

// Cognito ID tokens expire after 60 minutes (the default, unchanged by
// this project's Terraform) and this console has no other session
// management, so a session left open longer than that used to just fail
// every call with an opaque 401. Cognito's InitiateAuth REFRESH_TOKEN_AUTH
// is callable directly from the browser with no SDK — it's a plain JSON
// POST against Cognito's own public endpoint, needing only the client id
// (not a secret, since this app client has none) — so on a 401 this does
// one silent refresh-and-retry before giving up and forcing a real
// re-login.
function cognitoRegion() {
  const m = CONFIG.apiBase.match(/execute-api\.([a-z0-9-]+)\.amazonaws\.com/);
  return m ? m[1] : null;
}

async function refreshIdToken() {
  if (!state.refreshToken) return false;
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
        ClientId: CONFIG.cognitoClientId,
        AuthParameters: { REFRESH_TOKEN: state.refreshToken },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.AuthenticationResult) return false;
    state.idToken = data.AuthenticationResult.IdToken;
    localStorage.setItem('farmbook_idtoken', state.idToken);
    return true;
  } catch {
    return false;
  }
}

function forceReauth(message) {
  localStorage.removeItem('farmbook_idtoken');
  localStorage.removeItem('farmbook_refreshtoken');
  localStorage.removeItem('farmbook_farmid');
  localStorage.removeItem('farmbook_batchid');
  alert(message);
  location.reload();
}

async function api(method, path, body, _isRetry) {
  const headers = { 'content-type': 'application/json' };
  if (state.idToken) headers.authorization = `Bearer ${state.idToken}`;
  const res = await fetch(CONFIG.apiBase + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_isRetry) {
    logDebug(method, path, 401, { note: 'token expired or invalid — attempting silent refresh' });
    const refreshed = await refreshIdToken();
    if (refreshed) return api(method, path, body, true);
    forceReauth('Your session expired. Please sign in again.');
    throw new Error('session expired');
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  logDebug(method, path, res.status, data);
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function showView(id) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

// ---- Auth ----

$('otp-request-btn').addEventListener('click', async () => {
  const email = $('email-input').value.trim();
  if (!email) return alert('enter an email address');
  try {
    const data = await api('POST', '/auth/otp/request', { email });
    state.session = data.session;
    state.email = email;
    $('otp-step').classList.remove('hidden');
  } catch (e) {
    alert('Request failed: ' + e.message);
  }
});

$('otp-verify-btn').addEventListener('click', async () => {
  const code = $('otp-input').value.trim();
  if (!code) return alert('enter the code from the email');
  try {
    const data = await api('POST', '/auth/otp/verify', {
      email: state.email,
      session: state.session,
      code,
    });
    state.idToken = data.idToken;
    state.refreshToken = data.refreshToken;
    state.farmId = data.farmId;
    localStorage.setItem('farmbook_idtoken', state.idToken);
    localStorage.setItem('farmbook_refreshtoken', state.refreshToken);
    localStorage.setItem('farmbook_farmid', state.farmId);
    enterApp();
  } catch (e) {
    // A wrong code invalidates the old session — otp/verify hands back a
    // fresh one to retry with, since resending the same session again
    // fails with an unrelated-looking "Invalid session" error instead of
    // just "incorrect code" a second time.
    if (e.data && e.data.session) state.session = e.data.session;
    alert('Verify failed: ' + e.message);
  }
});

$('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('farmbook_idtoken');
  localStorage.removeItem('farmbook_refreshtoken');
  localStorage.removeItem('farmbook_farmid');
  localStorage.removeItem('farmbook_batchid');
  location.reload();
});

function enterApp() {
  $('user-info').classList.remove('hidden');
  $('nav-bar').classList.remove('hidden');
  $('farm-id-label').textContent = 'Farm: ' + state.farmId;
  showView('view-home');
  loadBatches();
}

// ---- Batches ----

async function loadBatches() {
  const data = await api('GET', '/batches');
  state.batches = data.batches || [];
  renderBatches();
}

function renderBatches() {
  const list = $('batch-list');
  list.innerHTML = '';
  if (state.batches.length === 0) {
    list.innerHTML = '<div class="muted">No batches yet — create one below.</div>';
  }
  state.batches.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'batch-row' + (b.batchId === state.currentBatchId ? ' active' : '');
    row.innerHTML = `<span><b>${escapeHtml(b.name)}</b> — ${escapeHtml(b.type)}, ` +
      `${escapeHtml(String(b.birdCount))} birds, ${escapeHtml(b.status)}` +
      `${b.batchId === state.currentBatchId ? ' (selected)' : ''}</span>`;
    row.addEventListener('click', () => selectBatch(b.batchId));
    list.appendChild(row);
  });
}

function selectBatch(id) {
  state.currentBatchId = id;
  localStorage.setItem('farmbook_batchid', id);
  renderBatches();
}

$('batch-create-btn').addEventListener('click', async () => {
  const name = $('batch-name').value.trim();
  const type = $('batch-type').value;
  const startDate = $('batch-start').value;
  const birdCount = Number($('batch-count').value);
  if (!name || !startDate || !birdCount) return alert('fill all batch fields');
  await api('POST', '/batches', { name, type, startDate, birdCount });
  $('batch-name').value = '';
  $('batch-count').value = '';
  loadBatches();
});

// ---- Generic log resources: mortality / feed / eggs / vaccinations ----
// Mirrors backend/src/lib/logResourceHandler.ts's shared GET/POST shape.

const LOG_RESOURCES = {
  mortality: {
    label: 'Birds Lost',
    path: 'mortality',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'count', label: 'Count', type: 'number', required: true },
      { key: 'note', label: 'Note (optional)', type: 'text' },
    ],
  },
  feed: {
    label: 'Feed',
    path: 'feed',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'feedType', label: 'Feed type', type: 'text', required: true },
      { key: 'amountKg', label: 'Amount (kg)', type: 'number', required: true },
      { key: 'costNaira', label: 'Cost (₦)', type: 'number', required: true },
    ],
  },
  eggs: {
    label: 'Eggs',
    path: 'eggs',
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'crates', label: 'Crates', type: 'number', required: true },
      { key: 'looseEggs', label: 'Loose eggs', type: 'number' },
      { key: 'revenueNaira', label: 'Revenue (₦, optional)', type: 'number' },
    ],
  },
  vaccinations: {
    label: 'Vaccination History',
    path: 'vaccinations',
    fields: [
      { key: 'vaccineName', label: 'Vaccine name', type: 'text', required: true },
      { key: 'dateAdministered', label: 'Date given', type: 'date', required: true },
      { key: 'costNaira', label: 'Cost (₦, optional)', type: 'number' },
    ],
  },
};

let currentLogResource = null;

function requireBatch() {
  if (!state.currentBatchId) {
    alert('Select or create a batch on the Home view first.');
    return false;
  }
  return true;
}

function openLogView(key) {
  if (!requireBatch()) return;
  currentLogResource = key;
  const cfg = LOG_RESOURCES[key];
  $('log-title').textContent = cfg.label;
  $('log-batch-label').textContent = state.currentBatchId;

  const formEl = $('log-form-fields');
  formEl.innerHTML = '';
  cfg.fields.forEach((f) => {
    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = f.label;
    const input = document.createElement('input');
    input.type = f.type;
    input.id = 'log-field-' + f.key;
    if (f.type === 'date') input.valueAsDate = new Date();
    label.appendChild(input);
    formEl.appendChild(label);
  });

  showView('view-log');
  loadLogEntries();
}

async function loadLogEntries() {
  const cfg = LOG_RESOURCES[currentLogResource];
  const data = await api('GET', `/batches/${state.currentBatchId}/${cfg.path}`);
  renderLogEntries(data.entries || []);
}

function renderLogEntries(entries) {
  const list = $('log-entries');
  list.innerHTML = '';
  if (entries.length === 0) list.innerHTML = '<div class="muted">No entries yet.</div>';
  entries.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'log-row mono';
    row.textContent = JSON.stringify(e);
    list.appendChild(row);
  });
}

$('log-submit-btn').addEventListener('click', async () => {
  const cfg = LOG_RESOURCES[currentLogResource];
  const body = {};
  for (const f of cfg.fields) {
    const el = $('log-field-' + f.key);
    const val = el.value;
    if (val === '') {
      if (f.required) return alert(`${f.label} is required`);
      continue;
    }
    body[f.key] = f.type === 'number' ? Number(val) : val;
  }
  await api('POST', `/batches/${state.currentBatchId}/${cfg.path}`, body);
  loadLogEntries();
});

// ---- Vaccination schedule ----

async function openScheduleView() {
  if (!requireBatch()) return;
  $('schedule-batch-label').textContent = state.currentBatchId;
  showView('view-schedule');
  await loadSchedule();
}

async function loadSchedule() {
  const data = await api('GET', `/batches/${state.currentBatchId}/vaccination-schedule`);
  const list = $('schedule-list');
  list.innerHTML = '';
  const items = data.schedule || [];
  if (items.length === 0) list.innerHTML = '<div class="muted">Nothing scheduled yet.</div>';
  items.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'log-row';
    const info = document.createElement('span');
    info.textContent = `${s.vaccineName} — due ${s.dueDate} — ${s.status}`;
    row.appendChild(info);
    if (s.status === 'upcoming') {
      const btn = document.createElement('button');
      btn.className = 'btn-small';
      btn.textContent = 'Mark done';
      btn.addEventListener('click', async () => {
        await api('PATCH', `/batches/${state.currentBatchId}/vaccination-schedule/${s.scheduleId}`, {
          status: 'done',
        });
        loadSchedule();
      });
      row.appendChild(btn);
    }
    list.appendChild(row);
  });
}

$('schedule-create-btn').addEventListener('click', async () => {
  const vaccineName = $('schedule-vaccine').value.trim();
  const dueDate = $('schedule-due').value;
  if (!vaccineName || !dueDate) return alert('fill both fields');
  await api('POST', `/batches/${state.currentBatchId}/vaccination-schedule`, { vaccineName, dueDate });
  $('schedule-vaccine').value = '';
  loadSchedule();
});

// ---- Summary ----

async function openSummaryView() {
  showView('view-summary');
  await loadSummary('week');
}

async function loadSummary(period) {
  const data = await api('GET', `/farms/${state.farmId}/summary?period=${period}`);
  $('summary-output').textContent = JSON.stringify(data, null, 2);
}

$('summary-week-btn').addEventListener('click', () => loadSummary('week'));
$('summary-month-btn').addEventListener('click', () => loadSummary('month'));

// ---- Offline sync ----
// Bypasses api() deliberately — the body is raw JSON Lines text, not a
// JSON value to stringify (see backend/src/handlers/sync/index.ts).

function openSyncView() {
  showView('view-sync');
}

$('sync-submit-btn').addEventListener('click', async () => {
  const body = $('sync-input').value;
  try {
    const res = await fetch(CONFIG.apiBase + '/sync/batch', {
      method: 'POST',
      headers: { authorization: `Bearer ${state.idToken}` },
      body,
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    logDebug('POST', '/sync/batch', res.status, data);
    $('sync-output').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    alert(e.message);
  }
});

// ---- Nav ----

$('nav-home').addEventListener('click', () => { showView('view-home'); loadBatches(); });
$('nav-mortality').addEventListener('click', () => openLogView('mortality'));
$('nav-feed').addEventListener('click', () => openLogView('feed'));
$('nav-eggs').addEventListener('click', () => openLogView('eggs'));
$('nav-vaccinations').addEventListener('click', () => openLogView('vaccinations'));
$('nav-schedule').addEventListener('click', () => openScheduleView());
$('nav-summary').addEventListener('click', () => openSummaryView());
$('nav-sync').addEventListener('click', () => openSyncView());

// ---- Init ----

if (state.idToken && state.farmId) {
  enterApp();
}
