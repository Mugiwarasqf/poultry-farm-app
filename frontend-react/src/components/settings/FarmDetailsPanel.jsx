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
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  DetailRow,
} from './ui';
import { allBirdTypes } from '../../lib/batch';
import { FarmPensCard } from './FarmPensCard';
import { FarmBirdTypesCard } from './FarmBirdTypesCard';

const farmBirdTypes = () => [
  ...allBirdTypes().map(({ value, label }) => ({ value, label })),
  { value: 'mixed', label: 'Mixed flock' },
];

export function FarmDetailsPanel() {
  const { farm, farmId, updateFarmProfile } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(farm?.name || '');
  const [location, setLocation] = useState(farm?.location || '');
  const [birdType, setBirdType] = useState(farm?.birdType || 'layer');

  useEffect(() => {
    if (editing) return;
    setName(farm?.name || '');
    setLocation(farm?.location || '');
    setBirdType(farm?.birdType || 'layer');
  }, [farm?.name, farm?.location, farm?.birdType, editing]);

  const handleCancel = () => {
    setName(farm?.name || '');
    setLocation(farm?.location || '');
    setBirdType(farm?.birdType || 'layer');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast('Farm name is required', 'error');

    setSaving(true);
    try {
      const updates = {
        name: name.trim(),
        location: location.trim() || undefined,
        birdType,
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

          <Field label="Main Bird Type">
            <SelectInput
              value={birdType}
              onChange={(e) => setBirdType(e.target.value)}
              disabled={!editing}
            >
              {farmBirdTypes().map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectInput>
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
