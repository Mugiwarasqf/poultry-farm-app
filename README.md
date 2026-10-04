# Poultry Farm App — Working Files

Independent project, separate from any other work in this Documents\Cloud
directory. Poultry farm record-keeping app for Nigerian farmers (mortality,
feed, egg production, vaccination tracking), validated via personal
connections in the industry (Lagos/Ikorodu-heavy so far). The backend
infrastructure and API are now scaffolded in code (31/08/2026) — see
`infra/` and `backend/` below — but nothing has been deployed anywhere yet.

**If you're an AI agent picking this project up, read `CLAUDE.md` first** —
it has the full findings, locked scope, working preferences, and next
steps. This README is a shorter, human-facing version of the same thing.

## Files, in the order this work actually happened

All numbered research/planning files below live in `docs/` — this README
and `CLAUDE.md` are the only files kept at the project root.

1. **`docs/01-validation-questionnaire.md`** / **`docs/01-validation-questionnaire-import.csv`**
   The original Google Forms survey — 27 questions across farm profile,
   current record-keeping habits, disease/insurance, credit access,
   willingness to pay, and contact info. The `.md` is the readable version
   with question types and the form's intro copy; the `.csv` is a
   spreadsheet-shaped import if a Forms add-on supports it.

2. **`docs/02-survey-responses.csv`**
   The actual collected responses — 27 as of 25/08/2026. Update this file
   whenever new responses come in.

3. **`docs/03-followup-interview-guide.md`**
   Six survey respondents worth going deeper with (trimmed from an original
   list of eight — two were cut for not mapping to any locked v1 feature),
   each with a personalized WhatsApp intro message and 3-5 follow-up
   questions. Conducted as async text, not calls.

4. **`docs/04-v1-feature-scope.md`**
   The actual product scope: 5 locked features, refined as real interview
   answers come in (currently reflects the Elizabeth interview's impact on
   the profit/expense summary feature). This is the canonical spec —
   update it, don't just leave refinements sitting in chat history.

5. **`docs/05-interview-elizabeth.txt`**, **`docs/06-interview-juliana.txt`**,
   **`docs/07-interview-banjo.txt`**, **`docs/08-interview-ruth.txt`**,
   **`docs/09-interview-toluwase.txt`**
   Raw WhatsApp transcripts. Elizabeth, Juliana, Ruth, and Toluwase are
   fully completed. Banjo and Lateef are both now unreachable (confirmed
   31/08/2026): Banjo stopped replying after his pricing question, and
   Lateef's number isn't on WhatsApp at all — the interview phase is
   closed at 4 of 6, not pursued further unless either reaches out on his
   own. Source material for the refinements in `docs/04-v1-feature-scope.md`.
   Add one file per interview as it happens (`docs/11-interview-<name>.txt`
   etc.), so the reasoning behind the scope stays traceable back to what
   was actually said.

6. **`docs/10-build-plan.md`**
   The living beta build plan — turns the locked feature scope and the
   proposed AWS direction into a concrete data model, API shape, and build
   sequence. Frontend framework is still an open decision, deliberately
   deferred so it doesn't block backend/data-model work.

7. **`infra/`** and **`backend/`**
   The build plan turned into real code (31/08/2026): a modular Terraform
   stack (`infra/main.tf` wires together `infra/modules/dynamodb`, `s3`,
   `auth_triggers`, `cognito`, `api_lambdas`, `api_gateway`, and
   `notifications` — Cognito, API Gateway, 19 Lambdas, 11 DynamoDB tables,
   S3, daily EventBridge notification schedules) and its TypeScript Lambda
   source in `backend/`. `terraform validate` / `terraform plan` and `npm
   run build` all pass clean, but nothing has been `terraform apply`'d —
   no AWS resource here exists yet. See `CLAUDE.md`'s "Infrastructure &
   backend" section for what's genuinely implemented versus flagged as a
   simplification, and its module dependency diagram.

## Key findings so far (see `docs/04-v1-feature-scope.md` for full detail)

- Paper record-keeping is universal; near-zero existing digital adoption.
- Insurance/compliance reporting is **not** a felt pain point (0-1 of 27
  respondents have insurance) — deprioritized from the original hypothesis.
- Vaccination record failures are the strongest validated pain point: four
  independent, unprompted respondents described real or near-catastrophic
  loss tied to missed or unconfirmed vaccination dates (originally counted
  as five, revised down after Ruth's follow-up traced her pox outbreak to
  a dirty environment after relocating, not a missed vaccination).
- A real low-digital-literacy segment exists (Banjo, Ruth) — avoid jargon
  like "cloud sync" in messaging, and don't assume cloud backup sells
  itself; it needs to work invisibly if included.
- Modal price point: ₦2,000-5,000/month, though a real "high interest,
  won't pay" segment exists (2+ respondents). Decided working model: free
  trial for initial users, converting to paid afterward — the actual
  post-trial price point is still unconfirmed, and Mathew's segment is
  still unaddressed.
