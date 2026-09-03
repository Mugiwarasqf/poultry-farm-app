import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";

// Cognito custom-auth trigger 3 of 3. Plain string comparison against the
// code createAuthChallenge.ts generated — Cognito calls this once per
// RespondToAuthChallenge and feeds the boolean straight back into
// defineAuthChallenge.ts's next decision.
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expected = event.request.privateChallengeParameters.answer;
  const actual = event.request.challengeAnswer;
  event.response.answerCorrect = expected === actual;
  return event;
};
