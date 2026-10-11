import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBatches } from '../../context/BatchContext';
import { updateFarm } from '../../api/farms';
import { useToast } from '../ui/Toast';
import { SettingsCard, PrimaryButton } from './ui';
import { BIRD_PURPOSES, BIRD_TYPES, birdTypeId } from '../../lib/batch';

const INPUT =
  'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-hidden focus:border-[#B7DA3E] focus:ring-2 focus:ring-[#DFFF83]/70';

const purposeLabel = (p) => BIRD_PURPOSES.find((x) => x.value === p)?.label || 'Other';

/**
 * Bird types: the built-in ones (read-only) plus the farm's own. Each custom
 * type carries what it's raised for, which decides egg logging and how its
 * performance is judged — so a new type works properly straight away.
 */
export function FarmBirdTypesCard() {
  const { farm, farmId, updateFarmProfile } = useAuth();
  const { batches } = useBatches();
  const toast = useToast();

  const saved = useMemo(() => farm?.birdTypes || [], [farm?.birdTypes]);
  const [types, setTypes] = useState(saved);
  const [newLabel, setNewLabel] = useState('');
  const [newPurpose, setNewPurpose] = useState('meat');
  const [saving, setSaving] = useState(false);

  useEffect(() => setTypes(saved), [saved]);

  const dirty = JSON.stringify(types) !== JSON.stringify(saved);
  const usedBy = (id) => batches.filter((b) => (b.type || '').toLowerCase() === id);

  const add = () => {
    const label = newLabel.trim();
    const id = birdTypeId(label);
    if (!label || !id) return toast('Give the bird type a name', 'error');
    const clash = [...BIRD_TYPES.map((t) => t.value), ...types.map((t) => t.id), 'chick', 'other'].includes(id);
    if (clash) return toast(`"${label}" already exists`, 'error');
    setTypes([...types, { id, label, purpose: newPurpose }]);
    setNewLabel('');
  };

  const remove = (type) => {
    const used = usedBy(type.id);
    if (used.length) return toast(`${type.label} is used by ${used.length} batch${used.length === 1 ? '' : 'es'}, so it can't be removed`, 'error');
    setTypes(types.filter((t) => t.id !== type.id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (farmId) await updateFarm(farmId, { birdTypes: types });
      updateFarmProfile({ birdTypes: types });
      toast('Bird types saved', 'success');
    } catch (err) {
      toast(err.message || 'Could not save bird types', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Bird Types"
      description="Add the birds you keep. What each is raised for decides how its performance is measured."
      action={
        <PrimaryButton icon={Check} onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save Types'}
        </PrimaryButton>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Built in</div>
          <div className="flex flex-wrap gap-2">
            {BIRD_TYPES.map((t) => (
              <span key={t.value} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50 text-xs text-stone-700">
                <span className="font-semibold">{t.label}</span>
                <span className="text-stone-400">· {purposeLabel(t.purpose)}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Your bird types</div>
          {types.length === 0 ? (
            <p className="text-sm text-stone-500">None added yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
              {types.map((t) => {
                const used = usedBy(t.id).length;
                return (
                  <li key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-3">
                    <input
                      value={t.label}
                      onChange={(e) => setTypes(types.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))}
                      className={INPUT}
                      aria-label="Bird type name"
                      maxLength={40}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={t.purpose}
                        onChange={(e) => setTypes(types.map((x) => (x.id === t.id ? { ...x, purpose: e.target.value } : x)))}
                        className={`${INPUT} sm:w-44 cursor-pointer`}
                        aria-label={`What ${t.label} is raised for`}
                      >
                        {BIRD_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      {used > 0 && (
                        <span className="shrink-0 text-[11px] text-stone-500 whitespace-nowrap">{used} batch{used === 1 ? '' : 'es'}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        disabled={used > 0}
                        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-400"
                        aria-label={`Remove ${t.label}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-stone-300 p-3 flex flex-col sm:flex-row gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="New bird type, e.g. Pigeon"
            className={INPUT}
            maxLength={40}
            aria-label="New bird type name"
          />
          <select
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
            className={`${INPUT} sm:w-44 cursor-pointer`}
            aria-label="What the new bird type is raised for"
          >
            {BIRD_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[#D2EC7A] text-sm font-semibold text-[#4D6600] hover:bg-[#F7FFE0] transition-colors cursor-pointer shrink-0"
          >
            <Plus size={15} /> Add
          </button>
        </div>
        <p className="text-xs text-stone-500">
          {BIRD_PURPOSES.map((p) => `${p.label}: ${p.description.toLowerCase()}`).join(' · ')}.
        </p>
      </div>
    </SettingsCard>
  );
}

export default FarmBirdTypesCard;
