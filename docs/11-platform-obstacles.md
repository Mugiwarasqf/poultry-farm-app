# Platform obstacles hit during this build

A record of the real external walls this project ran into while building
the backend and getting it ready for real users, kept separate from
`10-build-plan.md` so the obstacle, what was tried, and the outcome stay
traceable. These are AWS/Apple platform limitations and review decisions,
not product or scope changes (see `04-v1-feature-scope.md` for those).

## 1. AWS SNS SMS sandbox failure (31/08/2026)

The original, research-validated plan was phone number plus SMS OTP for
login (see `CLAUDE.md`'s key findings: the target audience skews
low-digital-literacy, and phone fits that better than email). Setting up
SMS sending failed account-wide: adding a test phone number to the SNS
SMS sandbox returned "No origination entities available to send" in both
`eu-west-1` and `us-east-1`, ruling out a region-specific problem.

This was an AWS account capability gap, not a decision about what suits
the target audience. Forced a switch to email plus OTP (Cognito
CUSTOM_AUTH, SES) to keep moving. That switch is flagged throughout the
codebase as pragmatic, not as new evidence that email fits Nigerian
poultry farmers better than phone.

**Status (07/10/2026): the underlying issue appears resolved.** Re-tested
the exact same action that failed originally (registering a number in the
SMS sandbox); it now succeeds cleanly. Phone/SMS auth is a live option
again, not just a future possibility. See item 5 below before committing
to a switch back.

## 2. AWS SES sandbox restrictions (ongoing since 31/08/2026)

Every new SES account starts in a sandbox: both the sender identity and
every single recipient address must be individually verified before mail
can be sent. This is standard for new accounts and expected, not a bug,
but it means real, unverified farmers can't receive OTPs or reminders
until the account is moved to production sending. Each person testing
this app so far has had to be added as a separately verified SES identity
(see `infra/modules/ses/`'s `test_recipient_emails`), which doesn't scale
to real users.

## 3. AWS SES production access request denied (submitted ~04/10/2026, denied 07/10/2026)

Requested production access (the fix for #2) with a detailed, accurate
use case: transactional-only OTP and reminder email, a verified domain
identity (`trackfarm.cc`) with DKIM, and a real automated bounce/complaint
suppression system (SNS topic, a dedicated Lambda, a DynamoDB suppression
table checked before every send). The request was denied twice in the
process, once misread on this end as a final denial when the actual
status was "pending customer action" (AWS asking for more detail, not
rejecting), and then genuinely denied after a complete resubmission.

The final denial gave no specific reason, only generic boilerplate
(AWS Acceptable Use Policy, Service Terms, SES best practices). AWS
doesn't disclose the exact trigger for a sandbox review decision. The
account remains in the SES sandbox: 200 emails/24 hours, every recipient
still needs individual verification.

## 4. Apple/iCloud outright rejecting mail (discovered 05/10/2026)

Separate from, and would likely persist even after, the SES sandbox
restriction above: emails to an `@icloud.com` address were being silently
lost. Diagnosed by adding bounce-detail logging to the bounce/complaint
handler Lambda (see `backend/src/handlers/sesEvents/`), which had
previously logged nothing for a Transient bounce. The real cause:

```
554 5.7.1 [HM08] Message rejected due to local policy.
Please visit https://support.apple.com/en-us/HT204137.
```

Apple's mail servers reject outright, not spam-filter, mail from
`trackfarm.cc` due to the domain having no sending history yet. This is a
reputation gate that generally resolves with real sending volume and time,
not something SPF/DKIM/DMARC records or an SES production-access grant
fix on their own. Gmail addresses are unaffected; this is specific to
Apple/iCloud recipients.

## 5. Where this leaves things

Two separate delivery problems hit the same email channel independently
(SES production access denied, Apple rejecting outright), while the
original blocker on the phone channel (#1) now appears resolved. Worth
treating phone/SMS auth as a real option again, not a closed chapter, the
next time auth delivery comes up as a decision, rather than assuming
email is the settled answer. Switching back has its own real cost: Cognito's
username attribute (email vs. phone) is immutable, so a switch means
destroying and recreating the user pool again, same as the original
switch away from phone did.
