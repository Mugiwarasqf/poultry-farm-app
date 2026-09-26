import { api } from './client';

export function requestOtp(email) {
  return api('POST', '/auth/otp/request', { email });
}

export function verifyOtp(email, session, code) {
  return api('POST', '/auth/otp/verify', { email, session, code });
}
