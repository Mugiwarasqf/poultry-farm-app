/**
 * Pens / houses on the farm (farm.pens: [{ id, name, capacity? }]).
 * A batch is placed in one through batch.penId.
 */

export function newPenId() {
  return `pen_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** The pen a batch is in, by id — or, for batches from before pens existed, by matching its house name. */
export function penForBatch(batch, pens = []) {
  if (!batch) return null;
  if (batch.penId) return pens.find((p) => p.id === batch.penId) || null;
  const house = (batch.housing || '').trim().toLowerCase();
  return house ? pens.find((p) => p.name.trim().toLowerCase() === house) || null : null;
}

/** Map of pen id → active batches in it. */
export function pensInUse(pens = [], batches = []) {
  const map = new Map();
  batches
    .filter((b) => (b.status || 'active') !== 'closed')
    .forEach((b) => {
      const pen = penForBatch(b, pens);
      if (!pen) return;
      if (!map.has(pen.id)) map.set(pen.id, []);
      map.get(pen.id).push(b);
    });
  return map;
}
