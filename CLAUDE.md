# Poultry Farm App

## What this is

A record-keeping app for Nigerian poultry farmers — mortality, feed, egg
production, and vaccination tracking, replacing the paper notebook most
farmers currently use. Validation drove the scope; the backend
infrastructure and API are now scaffolded in code (31/08/2026) but not
deployed anywhere — see "Current status" below. The founder has direct
personal connections in the poultry industry (heavily Lagos/Ikorodu-based
so far) that sourced the real survey responses and follow-up interviews
the scope and build plan are built on.

**This is an independent project.** It is unrelated to any other project
that might exist elsewhere in this Documents\Cloud directory (e.g.
VoiceBridge). Do not carry over names, tech stack choices, or assumptions
from another project into this one unless the user explicitly asks for a
comparison.

## Current status

- 27 survey responses collected (`docs/02-survey-responses.csv`), gathered via a
  Google Form built from `docs/01-validation-questionnaire.md`.
- 6 respondents identified for deeper follow-up (`docs/03-followup-interview-guide.md`),
  trimmed down from a longer list to only those tied to a locked v1 feature
  or the pricing question. **4 of 6 fully completed** (Elizabeth,
  `docs/05-interview-elizabeth.txt`; Juliana, `docs/06-interview-juliana.txt`;
  Toluwase, `docs/09-interview-toluwase.txt`; Ruth, `docs/08-interview-ruth.txt`).
  **The remaining 2 are now closed out, not just paused (31/08/2026):**
  Banjo (`docs/07-interview-banjo.txt`) stopped replying after his pricing
  question — his answer stays permanently unresolved unless he reaches
  back out on his own. Lateef's number isn't on WhatsApp at all, and per
  the "WhatsApp text, not calls" working preference below, that's treated
  as unreachable rather than a reason to switch to calling him. The
  interview phase is effectively done: 4 of the original 6 completed, 2
  unreachable.
- Product scope (`docs/04-v1-feature-scope.md`) is the living, canonical spec —
  update it, don't let refinements sit only in conversation.
- **Build plan written** (`docs/10-build-plan.md`, started 30/08/2026): turns
  the locked feature scope and proposed AWS direction into a concrete data
  model, API shape, and build sequence.
- **Backend + infra scaffolded in code (31/08/2026), not deployed.** `infra/`
  is a validated, modular Terraform stack (`terraform validate` and
  `terraform plan` both pass clean against the connected AWS account,
  543613943899 — nothing has been `apply`'d) covering Cognito email/OTP
  auth, API Gateway, 15 Lambda functions, 8 DynamoDB tables, S3, and daily
  EventBridge schedules for the two notification jobs. `backend/` is the
  TypeScript Lambda source (typechecks and bundles clean via `npm run
  build`). A git repo was initialized (31/08/2026) but nothing has been
  committed yet — see "Infrastructure & backend" below for what's real vs.
  still a stub, and its "Module structure" note for how `infra/` is laid
  out.
- **Frontend ownership settled (31/08/2026): a friend of the founder is
  building it.** Framework choice is theirs to make (`docs/10-build-plan.md`
  §8), doesn't block the backend work above. Design direction given to
  them: simple, minimalistic, farm-oriented — an interim v1 "face" for the
  app, expected to be replaced by something more sophisticated once
  there's real usage to design around. The FarmBook mockups
  (https://claude.ai/code/artifact/f771d22f-4184-4d2e-8ae8-f60f578d2858)
  already match that brief and are the starting visual reference to hand
  over, not a from-scratch design task.

## Key validated findings

- **Paper record-keeping is universal.** Near-zero existing digital
  adoption across all 27 respondents.
- **The original "insurance/compliance" hypothesis was wrong.** 0-1 of 27
  respondents carry poultry insurance (the mandatory-above-3,000-birds
  legal requirement doesn't appear to be enforced in practice), and disease
  reporting to authorities is rare. This was the original planned hook and
  it did not survive contact with real data — don't rebuild it into the
  pitch without new evidence.
- **Vaccination record failures are the strongest validated pain point.**
  Originally counted as five independent, unprompted respondents describing
  real or near-catastrophic loss tied to missed or unconfirmed vaccination
  dates — **revised to four** after Ruth's follow-up (25/08) showed her pox
  outbreak actually traced back to a dirty environment after relocating,
  not a missed vaccination as the survey response had suggested. Still the
  headline feature, not a nice-to-have — just a corrected count.
- **Credit access is aspirational, not active.** Frequently named as a
  top-3 challenge, but most respondents haven't applied for a loan, and
  where one was rejected, records weren't cited as the reason. Don't build
  loan-documentation features on this alone.
- **A real low-digital-literacy segment exists.** Banjo didn't recognize
  "book keeping app" as a concept, and Ruth said "I don't know cloud" when
  asked about cloud/phone backup. Don't pitch features using jargon like
  "cloud sync" to this audience, and don't assume cloud backup is a selling
  point — it needs to work invisibly if included at all, not be something
  the farmer has to understand or manage.
- **Modal price point: ₦2,000-5,000/month.** There's a real "high interest,
  won't pay anything" segment (2+ independent respondents, Juliana and
  Mathew). Juliana's follow-up (25/08) pointed toward this being about
  wanting a free trial first, not outright price rejection — she said she'd
  try the app to see if it's better than her current paper register.
  **Decided working model: free trial for initial users, converting to a
  paid subscription afterward.** Still open: the actual post-trial price
  point (no confirmed number yet), trial length, and whether Mathew's
  segment converts the same way — treat those as unresolved, not the
  trial-then-paid structure itself. Banjo's follow-up (25/08) didn't
  resolve anything on pricing either — he got asked what would make the app
  worth paying for and asked what "book keeping app" even meant, then went
  silent (confirmed 31/08 — he's stopped replying). Treat his pricing
  answer as permanently unresolved rather than a firm "no," but don't
  expect it to get answered now.
- Sample is geographically skewed toward Lagos/Ikorodu and farm-size skewed
  toward 50-500 birds — treat conclusions about very large (10,000+) farms
  or other regions as thin until more data comes in from those segments.

## Locked v1 feature scope

See `docs/04-v1-feature-scope.md` for full detail and reasoning. Summary:

1. **Mortality logging** — needs batch/cohort tagging, not just a date (a
   respondent running concurrent batches described mixing up which
   expenses belonged to which one).
2. **Feed tracking** — same batch-tagging requirement.
3. **Egg production tracking** — same batch-tagging requirement.
4. **Vaccination reminders** — needs to be both a forward-looking alert
   (missed a scheduled date) and a backward-looking log (couldn't confirm
   when the last one happened) — both failure modes showed up independently
   in interviews.
5. **Weekly/monthly profit & expense summary** — refined via the Elizabeth
   interview: running totals (not month-end batch math), category-level
   breakdown (feed cost, drug cost, egg revenue, not one net number), and
   weekly cadence rolling up into monthly.

Cross-cutting: reuse the same notification mechanism for vaccination
reminders and an "you haven't logged anything today/this week" nudge, since
Elizabeth's calculations broke specifically because of missing entries, not
bad math.

**Explicitly out of scope** until a second batch of interviews independently
repeats one of these: insurance/compliance export, loan/credit
documentation, voice-based data entry, buyer-facing traceability,
vet-connection features, market/sales access.

## Infrastructure & backend (scaffolded in code, not deployed)

The AWS direction discussed earlier is now a real Terraform stack in
`infra/` plus real Lambda TypeScript source in `backend/` — both pass
their respective checks (`terraform validate`/`terraform plan`, `tsc
--noEmit`, `npm run build`) but **nothing has been `terraform apply`'d**;
no AWS resource this stack defines exists yet in the connected account.

**Module structure** (`infra/main.tf` wires these together): `dynamodb`,
`s3`, `ses`, and `auth_triggers` have no dependencies (`auth_triggers`
needs `ses`'s identity for `create_challenge`'s IAM + env var, but `ses`
itself needs nothing); `cognito` depends on `auth_triggers`; `api_lambdas`
depends on `dynamodb` + `cognito` + `ses`; `api_gateway`, `notifications`,
and `frontend` each depend on `api_lambdas`/`cognito`/`api_gateway`
outputs. The three Cognito trigger Lambdas live in their own
`auth_triggers` module — separate from the other 12 in `api_lambdas` —
specifically to avoid a module dependency cycle: `cognito` needs their
ARNs for `lambda_config`, and the other Lambdas need `cognito`'s pool ID
for their own env vars. Splitting the trigger functions out breaks that
cycle. See `infra/main.tf`'s header comment for the full dependency
diagram.

- **Cognito** (`infra/modules/cognito/`) — email/OTP auth via a
  CUSTOM_AUTH challenge flow. Cognito never sends the email itself; the
  three Lambda triggers in `infra/modules/auth_triggers/`
  (`backend/src/handlers/authTriggers/`) generate the code, send it via
  direct SES `SendEmail`, and verify the answer. `POST /auth/otp/request`
  and `/verify` (`backend/src/handlers/auth/`) front Cognito's
  InitiateAuth/RespondToAuthChallenge and provision the Farm + User rows
  on a brand-new email address's first login. A security tradeoff is
  flagged in the cognito module's comments: user-existence errors are
  left enumerable so first-login auto-provisioning can work without a
  separate signup screen — revisit if that's ever the bigger risk.
  **⚠ This reverses a validated decision, on pragmatic grounds, not new
  research.** Auth was originally phone-number/OTP — "fits this audience
  better than email," grounded in the low-digital-literacy survey
  findings above. It switched to email (31/08/2026) after AWS SNS SMS
  sending failed account-wide with "No origination entities available to
  send" in both `eu-west-1` and `us-east-1` — an AWS account capability
  gap, not new evidence that email actually suits this audience better.
  If the SNS issue ever gets resolved, this is worth reconsidering rather
  than treating email as the settled answer.
- **API Gateway (HTTP API) + Lambda** — one Lambda per resource
  (`backend/src/handlers/*`, provisioned in `infra/modules/api_lambdas/`),
  routes wired in `infra/modules/api_gateway/`, protected by a Cognito JWT
  authorizer. `farmId` is always read from the authenticated token's
  `custom:farmId` claim, never trusted from the request
  (`backend/src/lib/http.ts`).
- **DynamoDB** (`infra/modules/dynamodb/`) — 8 tables, one per entity in
  `docs/10-build-plan.md` §2 (minus `ExpenseEntry`, which derives from
  `FeedLog`/`VaccinationRecord` at read time instead, per that doc). Two
  GSIs went beyond that doc's literal data model, both needed to make the
  notification Lambdas work and flagged where they're defined: a
  batchId-only index on `batches` (a schedule/log item only carries
  batchId, not farmId), and a status+dueDate index on
  `vaccination_schedules` (so the reminder job can ask "what's due soon"
  without scanning every batch).
- **Offline resilience** — `POST /sync/batch` (`backend/src/handlers/sync/`)
  accepts the on-device JSON Lines queue and applies each line
  idempotently (client-generated `entryId`, conditional put), matching the
  "lightweight, not full offline-first" direction: reads still require a
  live connection.
- **S3** (`infra/modules/s3/`) — attachments + reports buckets, both
  private with SSE. No Lambda writes to them yet; nothing has built the
  photo-attachment or PDF-export handlers.
- **SES** (`infra/modules/ses/`) — email only for now, sent by direct
  `SendEmail` to an address, from one verified sender identity
  (`var.ses_sender_email` in `infra/variables.tf`, **required, no
  default** — must be a real inbox someone will click SES's confirmation
  link in). Two daily EventBridge Schedules
  (`infra/modules/notifications/`) drive the notification Lambdas:
  vaccination reminders (a 3-day window, reusing one daily run to produce
  both the "few days before" and "day-of" touches Toluwase's interview
  confirmed — though that confirmation was specifically about a *phone*
  notification, another place the email switch may weaken the original
  finding) and the entry-completeness nudge from Elizabeth's finding. Push
  notifications aren't scaffolded — they need APNs/FCM credentials that
  don't exist without a built mobile app. SES has its own sandbox
  restriction, same shape as SNS's SMS one — see `docs/10-build-plan.md`
  §10.
- **CloudFront + S3** for a web dashboard — still not built; no signal yet
  that it's needed.
- Two data-model fields exist in `backend/src/lib/types.ts` that
  `docs/10-build-plan.md` didn't explicitly list — `VaccinationRecord.costNaira`
  and `EggLog.revenueNaira` — added because the summary endpoint can't
  compute a cost/revenue breakdown without them. `revenueNaira` in
  particular is optional and unused until a real price-per-crate decision
  gets made; flagged in that file's header comment.
- If the no-smartphone/USSD segment ever becomes real: AWS doesn't provide
  USSD directly, would need a Nigerian telco or aggregator (e.g. Africa's
  Talking) alongside AWS. Unchanged from the original discussion, still
  unvalidated (0/27 respondents selected "no smartphone, basic phone
  only").

## Working preferences for this project

- **Keep respondent outreach minimal.** The founder explicitly doesn't
  want to talk to more people than necessary — only add someone to the
  interview list if they map to a locked feature or an unresolved question
  (like the price contradiction), not just because they gave an
  interesting one-off answer.
- **Follow-ups are conducted as async WhatsApp text, not calls.** Send one
  question at a time and wait for a reply rather than dropping the whole
  list at once.
- **Ground every recommendation in the actual data, not generic startup
  advice** — this project already had one hypothesis (insurance/compliance)
  disproven by real responses; don't let a plausible-sounding assumption
  substitute for evidence again.
- Treat `docs/04-v1-feature-scope.md` as the single source of truth for scope;
  update it immediately when a new interview changes the picture, rather
  than leaving the refinement only in chat.

## File index

| File | Purpose |
|---|---|
| `docs/01-validation-questionnaire.md` / `.csv` | Original survey design + Google Form intro copy |
| `docs/02-survey-responses.csv` | All collected responses — append new ones here |
| `docs/03-followup-interview-guide.md` | The 6-person shortlist, WhatsApp intros, and questions |
| `docs/04-v1-feature-scope.md` | Canonical, living product spec |
| `docs/05-interview-elizabeth.txt`, `docs/06-interview-juliana.txt`, `docs/07-interview-banjo.txt`, `docs/08-interview-ruth.txt`, `docs/09-interview-toluwase.txt`, etc. | Raw transcripts of follow-ups, one file each (Banjo's is incomplete — he stopped replying) |
| `docs/10-build-plan.md` | Living beta build plan — data model, API shape, build sequence, open decisions |
| `infra/` | Terraform, modular (`infra/main.tf` + `infra/modules/*`) — Cognito (email/OTP), API Gateway, Lambda, DynamoDB, S3, SES/EventBridge. Validated + planned, not applied |
| `backend/` | TypeScript Lambda source, one handler per API resource. Typechecks + bundles clean |
| `README.md` | Shorter orientation doc, same information at a glance |
| `docs/` | Folder holding all numbered research/planning files above; `CLAUDE.md` and `README.md` stay at the project root |

## Next steps

1. **The phone/SNS version of this infra was actually deployed** (to
   543613943899) and tested working end to end before the email/SES
   switch — real Cognito pool, real API responses. The email/SES version
   is scaffolded and `terraform plan`-verified but **not yet applied** —
   applying it replaces the Cognito pool (username attribute is immutable
   in AWS, so this isn't optional) and any test users/sessions from the
   phone version are lost. To actually deploy it: set a real
   `ses_sender_email` in `infra/terraform.tfvars` (gitignored, copy from
   `terraform.tfvars.example`), run `terraform apply`, then check that
   inbox for SES's confirmation email and click the link — nothing sends
   until that's done. SES has its own sandbox restriction on top of that
   (recipients need verifying too until the account leaves sandbox), same
   shape as the SNS SMS one that triggered this whole switch.
2. Frontend build is now the founder's friend's responsibility — hand them
   the FarmBook mockups
   (https://claude.ai/code/artifact/f771d22f-4184-4d2e-8ae8-f60f578d2858),
   the design direction note in `docs/10-build-plan.md` §8, and
   `infra/modules/api_gateway/main.tf`'s route list so they can build
   against the scaffolded API. Framework choice is theirs. Note the auth
   payload shape changed from `{phone, ...}` to `{email, ...}` on both
   `/auth/otp/request` and `/auth/otp/verify` — make sure whatever they
   build reflects that.
3. Worth reconsidering the email/SNS reversal (item 1's "⚠" note above)
   once the underlying SNS account issue is understood or resolved —
   it was a pragmatic call, not new evidence that email fits this
   audience better than phone.
4. Pricing structure is decided (free trial → paid subscription); use
   placeholder trial length/price for the beta (`docs/10-build-plan.md` §7,
   `infra/variables.tf`'s `trial_length_days`) — the real numbers come from
   a second, dedicated payment survey once the trial phase has real
   traction (time-in-trial threshold or registered-to-active-user ratio,
   exact trigger TBD), not before launch.
5. Banjo and Lateef are both now unreachable (confirmed 31/08 — Banjo
   stopped replying, Lateef's number isn't on WhatsApp) — the interview
   phase is closed, don't keep trying either unless one of them reaches
   out first. Any remaining pricing/segment questions get answered by the
   later payment survey instead (see item 4).
6. First git commit hasn't happened yet — the repo is initialized
   (`git init`, 31/08/2026) with a `.gitignore` covering `node_modules/`,
   `dist/`, Terraform state/build artifacts, and secrets, but nothing is
   committed. Do that whenever the founder wants a checkpoint.
