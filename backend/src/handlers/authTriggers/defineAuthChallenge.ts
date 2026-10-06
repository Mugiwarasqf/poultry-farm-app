import type { DefineAuthChallengeTriggerHandler } from "aws-lambda";
import { logger } from "../../lib/logger";

// Cognito custom-auth trigger 1 of 3 (see infra/modules/cognito/). Drives
// the state machine for the email/OTP login: issue a challenge, check the
// result, decide whether to issue tokens, retry, or fail. The actual OTP
// generation/verification lives in the other two triggers.
const MAX_ATTEMPTS = 3;

export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const session = event.request.session;

  if (session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
    return event;
  }

  const last = session[session.length - 1];
  if (last.challengeName === "CUSTOM_CHALLENGE" && last.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (session.length >= MAX_ATTEMPTS) {
    logger.warn("auth_max_attempts_exceeded", { email: event.userName, attempts: session.length });
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = "CUSTOM_CHALLENGE";
  return event;
};
