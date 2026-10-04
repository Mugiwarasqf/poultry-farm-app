import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Trash2, Warehouse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBatches } from '../../context/BatchContext';
import { updateFarm } from '../../api/farms';
import { useToast } from '../ui/Toast';
import { SettingsCard, PrimaryButton } from './ui';
import { newPenId, pensInUse } from '../../lib/pens';

const MAX_PENS = 200;
const INPUT =
  'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-hidden focus:border-[#0D5C3A] focus:ring-2 focus:ring-[#0D5C3A]/15';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-bold text-stone-950 font-heading mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

/**
 * The farm's pens / houses. The farmer sets how many they have (rows are
 * added or removed to match) and names each one; batches are then placed in
 * a pen when they're created. A pen that holds an active batch can't be
 * removed, so no batch is left pointing at nothing.
 */
export function FarmPensCard() {
  const { farm, farmId, updateFarmProfile } = useAuth();
  const { batches } = useBatches();
  const toast = useToast();

  const saved = useMemo(() => farm?.pens || [], [farm?.pens]);
  const [pens, setPens] = useState(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => setPens(saved), [saved]);

  const usage = useMemo(() => pensInUse(pens, batches), [pens, batches]);
  const inUseCount = pens.filter((p) => usage.get(p.id)?.length).length;
  const dirty = JSON.stringify(pens) !== JSON.stringify(saved);

  const setCount = (raw) => {
    const target = Math.max(0, Math.min(MAX_PENS, Math.floor(Number(raw) || 0)));
    if (target > pens.length) {
      const extra = Array.from({ length: target - pens.length }, (_, i) => ({
        id: newPenId(),
        name: `Pen ${pens.length + i + 1}`,
      }));
      setPens([...pens, ...extra]);
      return;
    }
    // Shrinking drops pens from the end, but never one that's in use.
    const removable = pens.slice(target);
    const blocked = removable.find((p) => usage.get(p.id)?.length);
    if (blocked) {
      toast(`${blocked.name} has a batch in it, so it can't be removed`, 'error');
      return;
    }
    setPens(pens.slice(0, target));
  };

  const update = (id, field, value) => setPens(pens.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const remove = (pen) => {
    if (usage.get(pen.id)?.length) return toast(`${pen.name} has a batch in it, so it can't be removed`, 'error');
    setPens(pens.filter((p) => p.id !== pen.id));
  };

  const handleSave = async () => {
    const cleaned = pens.map((p) => ({
      id: p.id,
      name: (p.name || '').trim(),
      ...(Number(p.capacity) > 0 ? { capacity: Math.round(Number(p.capacity)) } : {}),
    }));
    if (cleaned.some((p) => !p.name)) return toast('Every pen needs a name', 'error');
    const names = cleaned.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) return toast('Two pens have the same name', 'error');

    setSaving(true);
    try {
      if (farmId) await updateFarm(farmId, { pens: cleaned });
      updateFarmProfile({ pens: cleaned });
      toast('Pens saved', 'success');
    } catch (err) {
      toast(err.message || 'Could not save pens', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Pens & Houses"
      description="How many pens your farm has. New batches are placed in one of these."
      action={
        <PrimaryButton icon={Check} onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save Pens'}
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Total pens" value={pens.length} />
        <Stat label="In use" value={inUseCount} />
        <Stat label="Free" value={pens.length - inUseCount} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm font-medium text-stone-700">Number of pens</span>
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => setCount(pens.length - 1)}
            className="w-9 rounded-l-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 cursor-pointer"
            aria-label="One pen fewer"
          >
            <Minus size={15} />
          </button>
          <input
            type="number"
            min="0"
            max={MAX_PENS}
            inputMode="numeric"
            value={pens.length}
            onChange={(e) => setCount(e.target.value)}
            className="w-16 border-y border-stone-200 text-center text-sm font-semibold text-stone-900 focus:outline-hidden"
            aria-label="Number of pens"
          />
          <button
            type="button"
            onClick={() => setCount(pens.length + 1)}
            className="w-9 rounded-r-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 cursor-pointer"
            aria-label="One pen more"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {pens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          No pens yet. Set the number above, then name each one.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
          {pens.map((pen) => {
            const inUse = usage.get(pen.id) || [];
            return (
              <li key={pen.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Warehouse size={16} className="text-stone-400 shrink-0" aria-hidden="true" />
                  <input
                    value={pen.name}
                    onChange={(e) => update(pen.id, 'name', e.target.value)}
                    className={INPUT}
                    aria-label="Pen name"
                    maxLength={60}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={pen.capacity ?? ''}
                    onChange={(e) => update(pen.id, 'capacity', e.target.value)}
                    placeholder="Capacity"
                    className={`${INPUT} sm:w-28`}
                    aria-label={`${pen.name} capacity (birds)`}
                  />
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                      inUse.length ? 'bg-[#EAF5EF] text-[#0D472B] border-[#CFE8D9]' : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}
                    title={inUse.map((b) => b.name).join(', ') || 'No active batch'}
                  >
                    {inUse.length ? (inUse.length === 1 ? inUse[0].name : `${inUse.length} batches`) : 'Free'}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(pen)}
                    disabled={inUse.length > 0}
                    className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    aria-label={`Remove ${pen.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsCard>
  );
}

export default FarmPensCard;
