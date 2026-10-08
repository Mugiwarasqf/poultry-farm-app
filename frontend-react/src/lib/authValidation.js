// Client-side mirror of the checks backend/src/handlers/auth/signup.ts and
// confirmForgotPassword.ts enforce server-side — catches the common cases
// before a round trip, the server is still the real gate either way.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  return EMAIL_RE.test(email.trim());
}

// Matches infra/modules/cognito/main.tf's password_policy exactly: at
// least 8 characters, a lowercase letter, and a number. No required
// uppercase/symbol on purpose -- typing complexity is itself friction for
// this audience, see that file's header comment.
export function passwordError(password) {
  if (password.length < 8) return 'Must be at least 8 characters';
  if (!/[a-z]/.test(password)) return 'Must include a lowercase letter';
  if (!/\d/.test(password)) return 'Must include a number';
  return null;
}

// The handful of email providers this market actually uses. Not
// exhaustive by design -- this only ever suggests, never blocks, so a
// real but unlisted domain is unaffected.
const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com'];

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * A near-miss suggestion for a likely domain typo (gmial.com -> gmail.com),
 * or null if the domain already looks fine or isn't close to anything on
 * the list. Never blocks submission -- this is a nudge, not a gate, since
 * plenty of real addresses use a domain outside this short list.
 */
export function suggestEmailCorrection(email) {
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;

  let best = null;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = candidate;
    }
  }
  return best && bestDistance > 0 && bestDistance <= 2 ? email.slice(0, at + 1) + best : null;
}
