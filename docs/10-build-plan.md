# Poultry Farm Record App — Beta Build Plan

Living document, started 30/08/2026 when the project moved from validation
into build planning. Turns the locked scope in `04-v1-feature-scope.md` and
the proposed AWS direction in `CLAUDE.md` into something buildable. Update
this as decisions get made — same rule as the other living docs in this
project.

Validation is closed as of 31/08/2026: 4 of 6 planned follow-ups completed
(Elizabeth, Juliana, Toluwase, Ruth). Banjo and Lateef are both
unreachable — Banjo stopped replying, Lateef's number isn't on WhatsApp —
so their open questions (his pricing answer, the vaccination-reminder
pattern from his angle) stay unresolved rather than pending; see
`04-v1-feature-scope.md`'s pricing section for what that leaves open.

---

## 1. Scope for the beta

The 5 locked features from `04-v1-feature-scope.md`, plus the
infrastructure needed to actually run them for real users:

1. Mortality logging (batch-tagged)
2. Feed tracking (batch-tagged)
3. Egg production tracking (batch-tagged)
4. Vaccination reminders (forward-looking alert + backward-looking history)
5. Weekly/monthly profit & expense summary (running totals, category
   breakdown, weekly rolling into monthly)

Plus, not a "feature" on that list but required to ship any of them:
email/OTP auth (switched from phone/OTP 31/08/2026 — see §4), the
notification mechanism #4 depends on, and the free trial → paid gate
agreed as the pricing model.

Out of scope is unchanged from `04-v1-feature-scope.md`: insurance/
compliance export, loan/credit documentation, voice-based data entry,
buyer-facing traceability, vet-connection features, market/sales access.

---

## 2. Data model

Every log entry needs a batch identifier per the Mathew Sunnyshine
finding (concurrent batches, mixed-up expenses) — this is the central
design constraint, not an add-on.

- **Farm** — one per account. `farmId`, owner email, name, location.
- **Batch** — a cohort of birds. `batchId`, `farmId`, start date, bird
  count, type (layer/broiler/etc), status (active/closed).
- **MortalityLog** — `batchId`, date, count, optional note.
- **FeedLog** — `batchId`, date, feed type/amount, cost.
- **EggLog** — `batchId`, date, crates/count.
- **VaccinationRecord** — `batchId`, vaccine/drug name, date administered.
  This is the backward-looking history (Jongbo, Toluwase's "when did we
  last vaccinate" gap).
- **VaccinationSchedule** — `batchId`, vaccine name, due date, status
  (upcoming/done/missed). Drives the forward-looking reminder (Toluwase,
  Lateef, Juliana's stories).
- **ExpenseEntry** — `batchId`, category (feed/drugs/other), amount, date.
  Feed and vaccination costs can derive from FeedLog/VaccinationRecord
  rather than being re-entered — avoid double entry.
- **User** — email (Cognito identity), farmId, trial/subscription status.

Weekly/monthly summaries (#5) are computed from MortalityLog, FeedLog,
EggLog, ExpenseEntry, and VaccinationRecord rather than stored separately —
Elizabeth specifically asked for cumulative running totals, not a
month-end batch calculation, so summary values should update as each entry
comes in.

---

## 3. API shape (API Gateway HTTP API + Lambda)

Grouped by resource, REST-ish. Auth via Cognito email/OTP on every route
except signup/login.

- `POST /auth/otp/request`, `POST /auth/otp/verify` — email login.
- `POST /batches`, `GET /batches`, `PATCH /batches/{id}` — create/list/
  close a batch.
- `POST /batches/{id}/mortality`, `GET /batches/{id}/mortality`
- `POST /batches/{id}/feed`, `GET /batches/{id}/feed`
- `POST /batches/{id}/eggs`, `GET /batches/{id}/eggs`
- `POST /batches/{id}/vaccinations`, `GET /batches/{id}/vaccinations` —
  the backward-looking log.
- `POST /batches/{id}/vaccination-schedule`,
  `GET /batches/{id}/vaccination-schedule` — the forward-looking schedule
  reminder emails are generated from.
- `GET /farms/{id}/summary?period=week|month` — the profit/expense
  rollup, category-broken-down, computed on read (or cached and
  invalidated on new entries, if read volume ends up justifying it).
- `POST /sync/batch` — accepts a JSON Lines batch of queued offline writes
  (see §5) and applies them idempotently.

---

## 4. Auth & onboarding

**Switched from phone/OTP to email/OTP (31/08/2026).** Originally Cognito
with phone number + OTP, matching the "fits this audience better than
email" reasoning in `CLAUDE.md`, grounded in the low-digital-literacy
survey findings. The switch was a pragmatic call after AWS SNS SMS
sending failed account-wide ("No origination entities available to send"
in both `eu-west-1` and `us-east-1`) — an AWS account capability gap, not
new user research suggesting email actually fits this audience better.
**This is flagged, not settled** — worth reconsidering if the SNS issue
gets resolved. See `CLAUDE.md`'s Cognito bullet for the full note.

Given the confirmed low-digital-literacy segment (Banjo not recognizing
"book keeping app", Ruth not knowing what "cloud" means), onboarding needs
to:

- Avoid technical vocabulary in any UI copy — no "sync," "cloud," "cache."
- Get a farmer to their first logged entry in as few screens as possible;
  don't front-load account setup before they see value.
- Assume the free trial starts automatically at signup — no separate
  "activate trial" step, since that's exactly the kind of friction this
  segment won't push through.

---

## 5. Notifications (SES)

One mechanism, two triggers, per the cross-cutting note in
`04-v1-feature-scope.md`:

- **Vaccination reminder** — driven by VaccinationSchedule due dates.
  Toluwase confirmed directly that a notification a few days before, plus
  a same-day reminder, would have prevented her 3-month miss — that's the
  cadence to build (T-minus-N-days + day-of), not a single alert. Note:
  her confirmation was specifically about a *phone* notification — now
  delivered by email instead (see §4's flag), which may not carry the
  same validated weight.
- **Entry-completeness nudge** — "nothing logged today/this week," tied to
  Elizabeth's finding that her totals broke from missing entries, not bad
  math.

Email via SES for now, not SMS via SNS (see §4). Push can be primary once
the frontend is chosen; SMS mattering most if a no-smartphone segment
shows up later (currently unvalidated — 0/27 survey respondents selected
"no smartphone, basic phone only") is now moot for auth specifically,
since email requires internet access anyway — worth remembering if that
segment does turn out to be real.

---

## 6. Offline resilience

Per the already-decided direction in `CLAUDE.md`: not full offline-first.
New records queue on-device as JSON Lines (append-only) during brief
connectivity gaps and flush to `POST /sync/batch` once back online. Reads
require a live connection — no local read/query layer needed.

---

## 7. Pricing / trial gate

Free trial for all new signups, converting to paid subscription
afterward — decided direction, see `CLAUDE.md`. For the beta specifically:

- Trial starts automatically at signup (see §4).
- Exact trial length and post-trial price are still open — the plan is a
  second payment survey once the trial has real traction (time-in-trial
  threshold or registered-to-active-user ratio, per prior discussion), not
  before. **For the beta, pick a placeholder trial length (e.g. 30 days)
  and a placeholder price, both clearly changeable** — don't let engineering
  convenience quietly lock in a number that was never validated.
- `User.trialStatus` / `subscriptionStatus` should be modeled so the gate
  can be adjusted without a schema change once real numbers come in.

---

## 8. Explicit open decisions

Don't let these block starting the backend/data-model work, but they need
answers before the beta can actually ship to a farmer's hands:

- **Frontend framework** — still not chosen (React Native, Flutter, mobile
  web, etc.), but ownership is settled (31/08/2026): a friend of the
  founder is building it, so the specific framework is their call to make.
  Backend API shape above is frontend-agnostic on purpose so this doesn't
  block backend work.
- **Design direction for the friend's build**: simple, minimalistic,
  farm-oriented — explicitly framed as an interim v1 "face" for the app,
  expected to get replaced by a more polished design later once there's
  real usage to design around. This matches the FarmBook mockups
  (https://claude.ai/code/artifact/f771d22f-4184-4d2e-8ae8-f60f578d2858)
  already produced from the same brief (large touch targets, plain
  language, no tech jargon, warm/friendly palette — driven by the
  low-digital-literacy findings in `CLAUDE.md`) — hand those to the friend
  as the starting visual reference rather than having them design from
  scratch. `infra/modules/api_gateway/main.tf` has the real route list
  their build needs to call.
- **Trial length and post-trial price** — placeholders only until the
  second payment survey (§7).
- **Web/admin dashboard** — CloudFront + S3 only if wanted beyond the
  mobile app; no signal yet that it's needed for beta.
- **Banjo's and Lateef's outstanding interview answers** — both closed out
  unreachable (31/08/2026), not paused; treat as permanently unresolved.

---

## 9. Suggested build sequence

1. Auth (Cognito email/OTP) + Farm/Batch creation — nothing else works
   without this.
2. Mortality, feed, and egg logging (batch-tagged CRUD) — the three
   universal, simplest features first.
3. Vaccination schedule + history (both directions) — the headline
   feature, but depends on batch scaffolding from step 2 being solid.
4. SES reminder + nudge notifications — depends on step 3's schedule data
   existing.
5. Profit/expense summary view — depends on steps 2-3's data existing to
   summarize.
6. Trial/subscription gating — can be built in parallel with 2-5 once
   Farm/User exists, but should be the last thing turned "on" so beta
   testers aren't paywalled before there's anything worth paying for.

---

## 10. How to view/test this after `terraform apply`

`frontend/` (hosted by `infra/modules/frontend/`, `terraform output
frontend_url`) is v1 of the actual product frontend and doubles as the
technical test console for the scaffolded API — its debug panel echoes
every raw request/response. That's the primary way to click through the
real auth + CRUD flow now; the options below are for when you need to see
what's happening underneath it.

- **`terraform output`** after apply — prints `api_endpoint`,
  `cognito_user_pool_id`, `cognito_client_id`, `frontend_url`,
  `ses_sender_email`, and the two S3 bucket names.
- **`terraform.tfvars` needs a real `ses_sender_email`** before applying —
  no default, must be an inbox you actually control. SES emails that
  address a confirmation link after `apply` that has to be clicked before
  anything can send; nothing arrives until that's done.
- **Calling the API directly** (curl, Postman, Insomnia, or just
  `frontend/`'s console) to exercise the real auth + CRUD flow:
  1. `POST {api_endpoint}/auth/otp/request` with `{"email": "you@..."}`.
  2. Watch for the email. **AWS SES starts every new account in a
     sandbox**, same shape as SNS's SMS sandbox: both the sender AND every
     recipient need to be verified identities until the account moves to
     production sending — an address that hasn't been verified in the SES
     console won't receive anything, worth checking before assuming the
     OTP flow is broken.
  3. `POST {api_endpoint}/auth/otp/verify` with `{"email", "session"
     (from step 1's response), "code"}` — returns `idToken` on success.
  4. Use `Authorization: Bearer <idToken>` on every other route (e.g.
     `POST {api_endpoint}/batches`).
- **AWS Console**, for looking at what actually exists rather than calling
  it: DynamoDB → Tables → "Explore table items" to see rows land as you
  call the API; Lambda → Functions → each one's Monitor tab or its
  CloudWatch Logs group (`/aws/lambda/<function-name>`) to debug a
  failure; Cognito → User pools to see provisioned users; SES → Verified
  identities to check sender/recipient status; API Gateway to see the
  route list matching `infra/modules/api_gateway/main.tf`.
