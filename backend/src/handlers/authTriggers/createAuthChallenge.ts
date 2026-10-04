import type { CreateAuthChallengeTriggerHandler } from "aws-lambda";
import { randomInt } from "node:crypto";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { isSuppressed } from "../../lib/suppression";

const ses = new SESClient({});
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;

// Cognito custom-auth trigger 2 of 3. Generates the OTP, emails it via
// SES, and stashes it in privateChallengeParameters (never sent to the
// client — only verifyAuthChallengeResponse.ts's Lambda execution can
// read it) for the verify trigger to check against.
//
// Email, not SMS (31/08/2026) — see otpRequest.ts's header comment for
// why. SES starts new accounts in a sandbox too, same shape as SNS's SMS
// sandbox: both SENDER_EMAIL and every recipient must be verified
// identities until the account is moved to production sending — see
// docs/10-build-plan.md §10.
//
// Simplifications flagged for whoever picks this up: every call mints and
// sends a brand-new code, even a retry within the same session (session
// length/attempts is bounded by defineAuthChallenge.ts's MAX_ATTEMPTS, so
// this isn't unbounded, but a real "resend" UX would want to reuse the
// outstanding code instead of invalidating it).
export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const email = event.request.userAttributes.email;

  // The challenge still has to be set up below even if we skip the send —
  // DefineAuthChallenge already committed to this flow, and Cognito
  // expects a real challenge back. A suppressed address just never
  // receives the code; that's the correct (if unhelpful to that one user)
  // outcome, since an address that permanently bounced or complained
  // can't be reached anyway, and re-sending to it would hurt the sending
  // domain's reputation for every real user. See lib/suppression.ts.
  if (!(await isSuppressed(email))) {
    await ses.send(
      new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "Your TrackFarm code" },
          Body: { Text: { Data: `Your TrackFarm code is ${code}.` } },
        },
      })
    );
  }

  event.response.publicChallengeParameters = {};
  event.response.privateChallengeParameters = { answer: code };
  event.response.challengeMetadata = `CODE-${Date.now()}`;
  return event;
};
