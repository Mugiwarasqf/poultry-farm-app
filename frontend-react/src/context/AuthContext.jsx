import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTokens, setTokens, clearTokens } from '../api/client';
import { clearOfflineRecords } from '../lib/pwa';
import { requestOtp, verifyOtp } from '../api/auth';
import { getFarm } from '../api/farms';
import { setCustomBirdTypes } from '../lib/batch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const stored = getTokens();
  const [idToken, setIdToken] = useState(stored.idToken);
  const [farmId, setFarmId] = useState(stored.farmId);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(stored.idToken && stored.farmId));

  // Farm Profile state from DynamoDB
  const [farm, setFarm] = useState(null);

  // Make the farm's own bird types known to every label / egg-logging /
  // performance helper in lib/batch.js. Done during render (it only sets a
  // module variable) so it's in place before any page reads it.
  setCustomBirdTypes(farm?.birdTypes);
  // Starts true for a returning (already signed-in) visitor. The fetch only
  // begins after the first render, and if this started false the route guard
  // in App.jsx would see "signed in, no farm yet" on that first render and
  // redirect a page refresh away from wherever the farmer was.
  const [farmLoading, setFarmLoading] = useState(Boolean(stored.idToken && stored.farmId));

  // OTP flow state
  const [otpSession, setOtpSession] = useState(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const loadFarm = useCallback(async (currentFarmId) => {
    const fid = currentFarmId || farmId;
    if (!fid) return;
    setFarmLoading(true);
    try {
      const data = await getFarm(fid);
      setFarm(data);
      if (data.onboarded) {
        localStorage.setItem('farmbook_onboarded', 'true');
      }
      if (data.name) {
        localStorage.setItem('farmbook_farmname', data.name);
      }
      if (data.farmerName) {
        localStorage.setItem('farmbook_farmername', data.farmerName);
      }
    } catch (e) {
      console.warn('Could not fetch farm profile from API (route may be pending deploy):', e);
      // Fall back to local storage profile if exists
      const localName = localStorage.getItem('farmbook_farmname');
      const localOnboarded = localStorage.getItem('farmbook_onboarded') === 'true';
      if (localName || localOnboarded) {
        setFarm({
          farmId: fid,
          name: localName || 'My Farm',
          farmerName: localStorage.getItem('farmbook_farmername') || '',
          location: localStorage.getItem('farmbook_farmlocation') || '',
          phone: localStorage.getItem('farmbook_farmphone') || '',
          onboarded: localOnboarded,
        });
      }
    } finally {
      setFarmLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    if (isLoggedIn && farmId) {
      loadFarm(farmId);
    } else {
      setFarm(null);
    }
  }, [isLoggedIn, farmId, loadFarm]);

  const updateFarmProfile = useCallback((updates) => {
    setFarm((prev) => ({ ...(prev || {}), ...updates }));
    if (updates.onboarded) {
      localStorage.setItem('farmbook_onboarded', 'true');
    }
    if (updates.name) {
      localStorage.setItem('farmbook_farmname', updates.name);
    }
    if (updates.farmerName) {
      localStorage.setItem('farmbook_farmername', updates.farmerName);
    }
    if (updates.location) {
      localStorage.setItem('farmbook_farmlocation', updates.location);
    }
    if (updates.phone) {
      localStorage.setItem('farmbook_farmphone', updates.phone);
    }
  }, []);

  const isOnboarded = Boolean(
    farm?.onboarded ||
    localStorage.getItem('farmbook_onboarded') === 'true' ||
    (farm?.name && farm.name !== 'My Farm')
  );

  const sendCode = useCallback(async (email) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = await requestOtp(email);
      setOtpSession(data.session);
      setOtpEmail(email);
      return true;
    } catch (e) {
      setAuthError(e.message || 'Failed to send code');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async (code) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = await verifyOtp(otpEmail, otpSession, code);
      setTokens({
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        farmId: data.farmId,
      });
      setIdToken(data.idToken);
      setFarmId(data.farmId);
      setIsLoggedIn(true);
      await loadFarm(data.farmId);
      return true;
    } catch (e) {
      setAuthError(e.message || 'Failed to verify code');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [otpEmail, otpSession, loadFarm]);

  const logout = useCallback(() => {
    clearTokens();
    clearOfflineRecords();
    localStorage.removeItem('farmbook_onboarded');
    setIdToken(null);
    setFarmId(null);
    setFarm(null);
    setIsLoggedIn(false);
    setOtpSession(null);
    setOtpEmail('');
  }, []);

  const value = {
    isLoggedIn,
    idToken,
    farmId,
    farm,
    farmLoading,
    isOnboarded,
    loadFarm,
    updateFarmProfile,
    otpSession,
    otpEmail,
    authLoading,
    authError,
    sendCode,
    verifyCode,
    logout,
    setAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
