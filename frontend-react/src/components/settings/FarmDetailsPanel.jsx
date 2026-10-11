import { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateFarm } from '../../api/farms';
import { useToast } from '../ui/Toast';
import {
  SettingsCard,
  FieldGrid,
  Field,
  TextInput,

  PrimaryButton,
  SecondaryButton,
  DetailRow,
} from './ui';
import { allBirdTypes, parseFarmBirdTypes } from '../../lib/batch';
import { MultiSelect } from '../ui/MultiSelect';
import { FarmPensCard } from './FarmPensCard';
import { FarmBirdTypesCard } from './FarmBirdTypesCard';

// "Mixed flock" was a single choice before several types could be picked; it
// is only listed for farms that still have it saved.
const farmBirdTypes = (selected = []) => [
  ...allBirdTypes().map(({ value, label }) => ({ value, label })),
  ...(selected.includes('mixed') ? [{ value: 'mixed', label: 'Mixed flock' }] : []),
];

export function FarmDetailsPanel() {
  const { farm, farmId, updateFarmProfile } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(farm?.name || '');
  const [location, setLocation] = useState(farm?.location || '');
  // The bird types the farm raises, stored comma-joined in farm.birdType.
  const [birdTypes, setBirdTypes] = useState(() => parseFarmBirdTypes(farm));

  useEffect(() => {
    if (editing) return;
    setName(farm?.name || '');
    setLocation(farm?.location || '');
    setBirdTypes(parseFarmBirdTypes(farm));
  }, [farm?.name, farm?.location, farm?.birdType, editing]);

  const handleCancel = () => {
    setName(farm?.name || '');
    setLocation(farm?.location || '');
    setBirdTypes(parseFarmBirdTypes(farm));
    setEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast('Farm name is required', 'error');
    if (birdTypes.length === 0) return toast('Choose at least one bird type', 'error');

    setSaving(true);
    try {
      const updates = {
        name: name.trim(),
        location: location.trim() || undefined,
        birdType: birdTypes.join(','),
      };

      updateFarmProfile(updates);

      if (farmId) {
        try {
          await updateFarm(farmId, updates);
        } catch (apiErr) {
          console.warn('Backend sync error (saved locally):', apiErr);
        }
      }

      toast('Farm details updated', 'success');
      setEditing(false);
    } catch (err) {
      toast(err.message || 'Could not save farm details', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Farm Details"
        description="Farm information and location shown across the app."
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <SecondaryButton icon={X} onClick={handleCancel} disabled={saving}>
                Cancel
              </SecondaryButton>
              <PrimaryButton icon={Check} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton icon={Pencil} onClick={() => setEditing(true)}>
              Edit Farm
            </PrimaryButton>
          )
        }
      >
        <FieldGrid>
          <Field label="Farm Name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing}
              placeholder="e.g. Green Valley Poultry Farm"
            />
          </Field>

          <Field label="Location">
            <TextInput
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!editing}
              placeholder="e.g. Ikorodu, Lagos"
            />
          </Field>

          <Field label="Bird Types You Raise">
            <MultiSelect
              options={farmBirdTypes(birdTypes)}
              value={birdTypes}
              onChange={setBirdTypes}
              disabled={!editing}
              placeholder="Select one or more bird types"
            />
          </Field>
        </FieldGrid>
      </SettingsCard>

      <FarmPensCard />

      <FarmBirdTypesCard />

      <SettingsCard title="Farm Record" description="Details recorded when this farm was created.">
        <div>
          <DetailRow label="Farm ID" value={farmId ? `${farmId.slice(0, 8)}…` : '—'} />
          <DetailRow
            label="Created"
            value={
              farm?.createdAt
                ? new Date(farm.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                : '—'
            }
          />
          <DetailRow label="Setup completed" value={farm?.onboarded ? 'Yes' : 'Not yet'} />
        </div>
      </SettingsCard>
    </div>
  );
}

export default FarmDetailsPanel;
