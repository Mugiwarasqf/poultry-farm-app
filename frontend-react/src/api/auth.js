import { api } from './client';

export function signup(email, password) {
  return api('POST', '/auth/signup', { email, password });
}

export function login(email, password) {
  return api('POST', '/auth/login', { email, password });
}

export function requestPasswordReset(email) {
  return api('POST', '/auth/forgot-password', { email });
}

export function confirmPasswordReset(email, code, newPassword) {
  return api('POST', '/auth/confirm-forgot-password', { email, code, newPassword });
}
