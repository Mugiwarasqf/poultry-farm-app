import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";
import { logger } from "../../lib/logger";

// Cognito custom-auth trigger 3 of 3. Plain string comparison against the
// code createAuthChallenge.ts generated — Cognito calls this once per
// RespondToAuthChallenge and feeds the boolean straight back into
// defineAuthChallenge.ts's next decision.
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expected = event.request.privateChallengeParameters.answer;
  const actual = event.request.challengeAnswer;
  const correct = expected === actual;
  event.response.answerCorrect = correct;
  // Never log expected/actual — only whether it matched. The codes
  // themselves are short-lived but still a credential, not something to
  // put in a log line.
  if (!correct) logger.warn("otp_code_mismatch", { email: event.userName });
  return event;
};
