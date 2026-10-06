import { useEffect, useState } from 'react';
import { Pencil, Check, X, Monitor, Smartphone, LogOut, KeyRound } from 'lucide-react';
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
  DangerButton,
  InsetPanel,
  StatusPill,
} from './ui';

const ROLES = ['Farm Manager', 'Farm Owner', 'Farm Worker', 'Veterinarian'];

// Role has no column in the Farm table (see the PATCH allowlist in
// backend/src/handlers/farms/index.ts), so it is kept on the device only and
// deliberately never sent to the API, which would reject it.
const ROLE_STORAGE_KEY = 'farmbook_role';

/** Best-effort device description from the user agent, for the session row. */
function describeThisDevice() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  let os = 'Unknown system';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return { os, browser, isMobile };
}

export function AccountPanel() {
  const { farm, farmId, updateFarmProfile, logout } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(farm?.farmerName || '');
  const [phone, setPhone] = useState(farm?.phone || '');
  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem(ROLE_STORAGE_KEY) || ROLES[0];
    } catch {
      return ROLES[0];
    }
  });

  // The farm profile arrives asynchronously, so seed the form once it lands
  // (but never while someone is mid-edit, which would wipe their typing).
  useEffect(() => {
    if (editing) return;
    setFullName(farm?.farmerName || '');
    setPhone(farm?.phone || '');
  }, [farm?.farmerName, farm?.phone, editing]);

  const email = farm?.ownerEmail || farm?.email || '';
  const displayName = farm?.farmerName || farm?.name || 'Your account';
  const device = describeThisDevice();

  const handleCancel = () => {
    setFullName(farm?.farmerName || '');
    setPhone(farm?.phone || '');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        farmerName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      updateFarmProfile(updates);
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, role);
      } catch {
        // Storage blocked — the rest of the save still stands.
      }

      if (farmId) {
        try {
          await updateFarm(farmId, updates);
        } catch (apiErr) {
          console.warn('Backend sync error (saved locally):', apiErr);
        }
      }

      toast('Account details updated', 'success');
      setEditing(false);
    } catch (err) {
      toast(err.message || 'Could not save your details', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Account Settings"
        description="Update your personal details and login information."
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
              Edit Profile
            </PrimaryButton>
          )
        }
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/images/irvan-maulana-ENQIxReDFKE-unsplash.jpg"
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-stone-950 font-heading truncate">{displayName}</div>
            <div className="text-sm text-stone-500 truncate">{email || 'No email on file'}</div>
          </div>
        </div>

        <FieldGrid>
          <Field label="Full Name">
            <TextInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!editing}
              placeholder="Your name"
            />
          </Field>

          <Field label="Phone Number">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editing}
              placeholder="e.g. 0803 000 0000"
            />
          </Field>

          <Field
            label="Email Address"
            hint="This is your sign-in address and cannot be changed here."
          >
            <TextInput value={email} disabled readOnly />
          </Field>

          <Field label="Role" hint="Saved on this device only.">
            <SelectInput value={role} onChange={(e) => setRole(e.target.value)} disabled={!editing}>
              {ROLES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </SelectInput>
          </Field>
        </FieldGrid>

        <div className="mt-6">
          <InsetPanel
            title="Sign-in Security"
            description="You sign in with a one-time code sent to your email address, so there is no password to change."
            action={
              <SecondaryButton icon={KeyRound} disabled>
                No password set
              </SecondaryButton>
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Login Sessions"
        description="Manage devices where you are currently logged in."
      >
        <div className="divide-y divide-stone-100">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                {device.isMobile ? (
                  <Smartphone size={18} strokeWidth={2.5} className="text-stone-600" />
                ) : (
                  <Monitor size={18} strokeWidth={2.5} className="text-stone-600" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-900">Current Session</div>
                <div className="text-xs text-stone-500 truncate">
                  {device.os} • {device.browser}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <StatusPill tone="active">Active</StatusPill>
              <div className="text-xs text-stone-400 mt-1">Active now</div>
            </div>
          </div>
        </div>

        {/* Only the session on this device can be listed. Sessions aren't
            recorded server-side, so any other device would be invented. */}
        <p className="text-xs text-stone-500 mt-3">
          Only this device can be shown. TrackFarm does not yet keep a record of sign-ins on your
          other devices.
        </p>

        <div className="mt-5">
          <DangerButton icon={LogOut} onClick={logout}>
            Log out of this device
          </DangerButton>
        </div>
      </SettingsCard>
    </div>
  );
}

export default AccountPanel;
