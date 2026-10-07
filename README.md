# TrackFarm

Record-keeping app for Nigerian poultry farmers: mortality, feed, egg
production, and vaccination tracking, validated via personal connections
in the industry (Lagos/Ikorodu-heavy so far). The product is called
TrackFarm, at `trackfarm.cc`; it was called FarmBook through most of the
build and that name still appears on the original design mockups.

Independent project, separate from any other work in this Documents\Cloud
directory. `CLAUDE.md` has the full findings, locked scope, working
preferences, and next steps; this README is a shorter version of the same
thing.

## Files, in the order this work actually happened

All numbered research/planning files below live in `docs/`; this README
and `CLAUDE.md` are the only files kept at the project root.

1. **`docs/01-validation-questionnaire.md`** / **`docs/01-validation-questionnaire-import.csv`**
   The original Google Forms survey, 27 questions across farm profile,
   current record-keeping habits, disease/insurance, credit access,
   willingness to pay, and contact info.

2. **`docs/02-survey-responses.csv`**
   The actual collected responses, 27 as of 25/08/2026.

3. **`docs/03-followup-interview-guide.md`**
   Six survey respondents worth going deeper with, each with a
   personalized WhatsApp intro message and follow-up questions. Conducted
   as async text, not calls.

4. **`docs/04-v1-feature-scope.md`**
   The actual product scope: 5 locked features, refined as real interview
   answers came in. This is the canonical spec; update it directly rather
   than leaving refinements in chat history.

5. **`docs/05-interview-elizabeth.txt`**, **`docs/06-interview-juliana.txt`**,
   **`docs/07-interview-banjo.txt`**, **`docs/08-interview-ruth.txt`**,
   **`docs/09-interview-toluwase.txt`**
   Raw WhatsApp transcripts. Elizabeth, Juliana, Ruth, and Toluwase are
   fully completed. Banjo and Lateef are both unreachable (Banjo stopped
   replying after his pricing question; Lateef's number isn't on
   WhatsApp). The interview phase is closed at 4 of 6.

6. **`docs/10-build-plan.md`**
   The living beta build plan: the locked feature scope and the AWS
   direction turned into a concrete data model, API shape, and build
   sequence.

7. **`docs/11-platform-obstacles.md`**
   Real AWS/Apple platform walls hit while building and getting ready for
   real users: an AWS SMS sandbox failure, SES sandbox restrictions, a
   denied SES production access request, and Apple/iCloud outright
   rejecting mail from the new domain. Includes current status on each.

8. **`infra/`** and **`backend/`**
   The build plan as real code: a modular Terraform stack
   (`infra/main.tf` wires together `infra/modules/dynamodb`, `s3`, `ses`,
   `auth_triggers`, `cognito`, `api_lambdas`, `api_gateway`,
   `notifications`, and `frontend`, covering Cognito, API Gateway, 20
   Lambdas, 12 DynamoDB tables, S3, SES, and daily EventBridge
   notification schedules) and its TypeScript Lambda source in `backend/`.
   `trackfarm.cc` is live: the apex serves the frontend via CloudFront,
   `api.trackfarm.cc` serves the backend. See `CLAUDE.md`'s
   "Infrastructure" section for module detail and its dependency diagram.

9. **`frontend-react/`**
   The real product frontend (Vite plus React), built by a friend of the
   founder: batches, logging, schedule, inventory, settings, offline
   queue. Its API client code is the source of truth for what the backend
   needs to support.

## Key findings so far (see `docs/04-v1-feature-scope.md` for full detail)

- Paper record-keeping is universal; near-zero existing digital adoption.
- Insurance/compliance reporting is not a felt pain point (0-1 of 27
  respondents have insurance), deprioritized from the original hypothesis.
- Vaccination record failures are the strongest validated pain point:
  four independent, unprompted respondents described real or
  near-catastrophic loss tied to missed or unconfirmed vaccination dates.
- A real low-digital-literacy segment exists (Banjo, Ruth); avoid jargon
  like "cloud sync" in messaging, and don't assume cloud backup sells
  itself.
- Modal price point: ₦2,000 to 5,000/month, though a real "high interest,
  won't pay" segment exists. Decided working model: free trial for
  initial users, converting to paid afterward; the post-trial price point
  is still unconfirmed.

## Current obstacles

Two separate problems have hit email delivery (the current login/
notification channel): AWS denied the SES production access request, and
Apple/iCloud is outright rejecting mail from the new domain due to no
sending reputation yet. The original SMS auth blocker (an AWS account
capability gap) now appears resolved, reopening phone/SMS as an option.
Full detail in `docs/11-platform-obstacles.md`.
