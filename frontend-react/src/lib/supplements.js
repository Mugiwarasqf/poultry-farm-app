/**
 * Vitamins and supplements: the catalogue the "Record Vitamin" form offers,
 * and the on-device store the records live in.
 *
 * There is no supplements endpoint on the backend yet, so records are kept in
 * localStorage on this device only — say so wherever they're shown.
 *
 * Each type has a default method (drinking water or mixed in feed), which
 * decides how the dose is written: "5 g per 4 litres of water" versus
 * "250 g per bag of feed". Dewormers carry a withdrawal period — the days
 * eggs or meat shouldn't be sold after treatment — so the form asks for it.
 */

export const SUPPLEMENT_TYPES = [
  { id: 'multivitamin', label: 'Multivitamin', method: 'water', examples: 'e.g. Vitalyte, Vitaminex, Vitacomplex', duration: 3 },
  { id: 'anti_stress', label: 'Electrolyte / Anti-stress', method: 'water', examples: 'e.g. Anti-stress, glucose, electrolytes', duration: 3 },
  { id: 'amino', label: 'Amino acids / Growth booster', method: 'water', examples: 'e.g. Amino Plus, Aminovit', duration: 5 },
  { id: 'calcium', label: 'Calcium', method: 'feed', examples: 'e.g. Oyster shell, limestone, calcium syrup', duration: 7 },
  { id: 'vit_e_se', label: 'Vitamin E + Selenium', method: 'water', examples: 'e.g. E-Sel, Vitamin E + Se', duration: 3 },
  { id: 'probiotic', label: 'Probiotic', method: 'water', examples: 'e.g. Bactosac, probiotic powder', duration: 5 },
  { id: 'liver_tonic', label: 'Liver tonic', method: 'water', examples: 'e.g. Hepato, liver tonic', duration: 3 },
  { id: 'dewormer', label: 'Dewormer', method: 'water', examples: 'e.g. Piperazine, Levamisole, Albendazole', duration: 1, withdrawal: true },
  { id: 'other', label: 'Other supplement', method: 'water', examples: 'Product name', duration: 1, withdrawal: true },
];

export const METHODS = {
  water: { label: 'Drinking water', units: ['g', 'ml'], per: 'litres of water', defaultPer: 1 },
  feed: { label: 'Mixed in feed', units: ['g', 'kg'], per: 'bag(s) of feed (25kg)', defaultPer: 1 },
};

export const REASONS = ['Routine', 'After vaccination', 'Heat stress', 'Drop in lay', 'Poor growth', 'After illness', 'Transport / moving'];

export function findSupplementType(id) {
  return SUPPLEMENT_TYPES.find((t) => t.id === id) || null;
}

/** "5 g per 4 litres of water · 3 days" — or the free-text dosage on older entries. */
export function describeDose(entry) {
  if (!entry) return '';
  if (entry.doseAmount == null) return entry.dosage || '';
  const method = METHODS[entry.method] || METHODS.water;
  const per = Number(entry.perQuantity) || method.defaultPer;
  const perText = entry.method === 'feed'
    ? `${per} bag${per === 1 ? '' : 's'} of feed`
    : `${per} litre${per === 1 ? '' : 's'} of water`;
  const days = Number(entry.durationDays) || 1;
  return `${entry.doseAmount} ${entry.doseUnit} per ${perText} · ${days} day${days === 1 ? '' : 's'}`;
}

/** Every date an entry covers (start date + duration), capped at 30 days. */
export function supplementDates(entry) {
  if (!entry?.date) return [];
  const days = Math.min(Math.max(Number(entry.durationDays) || 1, 1), 30);
  const start = new Date(entry.date + 'T00:00:00');
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toIso(d);
  });
}

export function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---- on-device store ------------------------------------------------------

const STORE_KEY = 'farmbook_supplements';
const LEGACY_INVENTORY_KEY = 'farmbook_inventory_multivitamins';
const LEGACY_BATCH_PREFIX = 'farmbook_multivitamins_';

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Older builds kept multivitamins under two unrelated keys — one for the
 * Inventory page, one per batch — so the two screens never showed the same
 * records. Fold both into the single store, once.
 */
function migrateLegacy(existing) {
  const merged = [...existing];
  const seen = new Set(merged.map((e) => e.id));
  const add = (entry, batchId) => {
    const id = entry.id || `${batchId}-${entry.date}-${entry.product}`;
    if (seen.has(id)) return;
    seen.add(id);
    merged.push({ type: 'multivitamin', ...entry, id, batchId: entry.batchId || batchId });
  };

  let changed = false;
  try {
    const inventory = safeRead(LEGACY_INVENTORY_KEY);
    if (Array.isArray(inventory)) {
      inventory.forEach((e) => add(e, e.batchId));
      localStorage.removeItem(LEGACY_INVENTORY_KEY);
      changed = true;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(LEGACY_BATCH_PREFIX)) continue;
      const list = safeRead(key);
      if (Array.isArray(list)) list.forEach((e) => add(e, key.slice(LEGACY_BATCH_PREFIX.length)));
      localStorage.removeItem(key);
      changed = true;
    }
  } catch {
    // Storage blocked — nothing to migrate.
  }
  return { merged, changed };
}

export function loadSupplements() {
  const stored = safeRead(STORE_KEY);
  const { merged, changed } = migrateLegacy(Array.isArray(stored) ? stored : []);
  if (changed) saveAll(merged);
  return merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function saveAll(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked; the in-memory list still updates this session.
  }
}

/** Adds an entry and returns the updated, newest-first list. */
export function addSupplement(entry) {
  const list = [{ ...entry, id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...loadSupplements()];
  saveAll(list);
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
