import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Check, X, Monitor, Smartphone, LogOut, KeyRound, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateFarm } from '../../api/farms';
import { useToast } from '../ui/Toast';
import { isValidEmailFormat } from '../../lib/authValidation';
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
  const { farm, farmId, updateFarmProfile, logout, emailBounced } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(farm?.farmerName || '');
  const [phone, setPhone] = useState(farm?.phone || '');
  const [emailAddress, setEmailAddress] = useState(farm?.ownerEmail || '');
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
    setEmailAddress(farm?.ownerEmail || '');
  }, [farm?.farmerName, farm?.phone, farm?.ownerEmail, editing]);

  const email = farm?.ownerEmail || farm?.email || '';
  const displayName = farm?.farmerName || farm?.name || 'Your account';
  const device = describeThisDevice();

  const handleCancel = () => {
    setFullName(farm?.farmerName || '');
    setPhone(farm?.phone || '');
    setEmailAddress(farm?.ownerEmail || '');
    setEditing(false);
  };

  const handleSave = async () => {
    if (emailAddress.trim() && !isValidEmailFormat(emailAddress)) {
      toast('Enter a valid email address', 'error');
      return;
    }
    setSaving(true);
    try {
      const emailChanged = emailAddress.trim() && emailAddress.trim() !== farm?.ownerEmail;
      const updates = {
        farmerName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        ownerEmail: emailAddress.trim() || undefined,
      };

      // The server clears emailBounced on a changed address (see
      // farms/index.ts's PATCH handler), but it only returns which keys
      // changed, not the full record -- mirror that here so the banner
      // disappears immediately instead of waiting for the next full
      // farm reload.
      updateFarmProfile(emailChanged ? { ...updates, emailBounced: false } : updates);
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
          <div className="w-16 h-16 rounded-full bg-[#EFFFC4] dark:bg-[#142312] text-[#4D6600] dark:text-[#DFFF83] border border-[#E3F5A8] dark:border-[#274220] flex items-center justify-center shrink-0 shadow-2xs">
            <User size={30} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-stone-950 dark:text-[#F5F7F5] font-heading truncate">{displayName}</div>
            <div className="text-sm text-stone-500 dark:text-[#94A3B8] truncate">{email || 'No email on file'}</div>
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
            hint={
              emailBounced
                ? "We couldn't deliver to this address — fix it so reminders and password reset work again."
                : "Where reminders and account notices go. Doesn't change what you sign in with."
            }
          >
            <TextInput
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              disabled={!editing}
              placeholder="farmer@example.com"
            />
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
            description="You sign in with your email and password."
            action={
              <SecondaryButton icon={KeyRound} onClick={() => navigate('/forgot-password')}>
                Change password
              </SecondaryButton>
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Login Sessions"
        description="Manage devices where you are currently logged in."
      >
        <div className="divide-y divide-stone-100 dark:divide-[#2B3238]">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#252A2E] flex items-center justify-center shrink-0">
                {device.isMobile ? (
                  <Smartphone size={18} strokeWidth={2.5} className="text-stone-600 dark:text-[#94A3B8]" />
                ) : (
                  <Monitor size={18} strokeWidth={2.5} className="text-stone-600 dark:text-[#94A3B8]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-900 dark:text-[#F5F7F5]">Current Session</div>
                <div className="text-xs text-stone-500 dark:text-[#94A3B8] truncate">
                  {device.os} • {device.browser}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <StatusPill tone="active">Active</StatusPill>
              <div className="text-xs text-stone-400 dark:text-[#64748B] mt-1">Active now</div>
            </div>
          </div>
        </div>

        {/* Only the session on this device can be listed. Sessions aren't
            recorded server-side, so any other device would be invented. */}
        <p className="text-xs text-stone-500 dark:text-[#94A3B8] mt-3">
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
