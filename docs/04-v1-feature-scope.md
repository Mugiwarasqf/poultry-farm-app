# Poultry Farm Record App — v1 Feature Scope

Living document. Started from 26+ survey responses, refined as follow-up
interviews come in. Update this, don't just keep the detail in chat.

---

## 1. Mortality logging
Log bird deaths as they happen. Universal current practice (100% of survey
respondents track this somehow, mostly on paper).

**Data model note** (from Mathew Sunnyshine's interview, Gombe): farms
running multiple concurrent batches need records tagged by batch/cohort, not
just by farm — he described mistakenly attributing batch C's expenses to
batch D. Applies to this feature and #2/#3 below: every log entry needs a
batch identifier, not just a date.

---

## 2. Feed tracking
Log feed usage and cost. Same universal-current-practice pattern as
mortality; the single most-cited top-3 challenge across the whole dataset.
Needs batch tagging (see note above).

---

## 3. Egg production tracking
Log laying counts / egg crates. Same pattern among layer farmers
specifically. Needs batch tagging (see note above).

---

## 4. Vaccination reminders
The headline feature. Originally counted as five independent, unprompted
respondents describing real or near-catastrophic loss tied to vaccination
record failures (Toluwase, Lateef, Ruth, Juliana, Jongbo) — **revised to
four** after Ruth's follow-up (see correction below).

Two distinct failure modes showed up, so this needs to be both a reminder
and a log, not just one or the other:
- **Forward-looking**: missed a scheduled date entirely (Toluwase, Lateef,
  Juliana) — needs a notification before a vaccination is due.
- **Backward-looking**: knew a vaccination was needed but couldn't confirm
  when the last one happened (Jongbo) — needs a simple, checkable history,
  not just a forward alert.

**Data point from Juliana's interview (25/08)**: she already keeps a paper
register for vaccination dates — the miss happens specifically when she
forgets to check it. Confirms that a passive log isn't enough even for
someone with an existing system; the value is the active reminder, not just
a place to record dates.

**Data point from Toluwase's interview (25/08)** — the strongest cost story
so far: she forgot a vaccination for almost three months, only catching it
after feed intake dropped, the birds got sick, and a colleague asked her
when the last vaccine was — she didn't know until asked. Cost: drastically
reduced feed intake, more drugs bought to treat the sick birds, and roughly
a month of zero egg production (no bird deaths, which she called "a rare
grace"). This is also a real-world backward-looking case, not just Jongbo's
— she had to reconstruct the last vaccination date from memory/a colleague's
prompt, the exact gap feature #4's history view is meant to close.

Since then she's self-built a workaround: a written record plus a phone
alarm, and telling her spouse and children as a human backup. That's
useful signal for the reminder UX — she's already trying to simulate what
a notification feature would do with manual tools, which is a strong
in-favor signal, but also means the app needs to be at least as reliable as
"tell your whole family" or it won't get trusted enough to replace it.
Asked directly whether a phone notification a few days before, plus a
same-day reminder, would help her avoid missing an appointment, she
confirmed: "Yes, it does." Interview complete.

**Correction from Ruth's interview (25/08)**: the survey had her pox
outbreak down as a missed/delayed vaccination, but she directly said "I
always vaccinate my birds" — the outbreak traced back to a dirty environment
at the farm's new location after relocating, not a missed vaccination date.
Remove her from the vaccination-miss count; this is a biosecurity/hygiene
story, not a reminders story, and doesn't validate feature #4 the way it
was assumed to. (It's a single data point and biosecurity is still out of
scope per the section below — noting it here so the count stays honest,
not proposing a new feature.)

Separately, her record-loss-on-relocation story (losing her paper
vaccination log when she moved farms) turned out weaker than assumed too —
asked directly, she said it "doesn't cause any problems." Don't lean on this
as a strong case for cloud-backed record storage; it's a nice-to-have
benefit of the app, not a validated pain point on its own.

Asked directly whether cloud/phone storage would have saved her lost
records, her answer was "I don't know cloud and may be I will try phone in
future" — she doesn't have a working concept of "the cloud" (a low
digital-literacy signal, similar to Banjo not recognizing "book keeping
app"), and even phone storage only got a noncommittal "maybe, in future."
Interview complete. Net effect: cloud backup should not be pitched as a
selling point to this segment, and any such feature needs to work
invisibly rather than requiring the farmer to understand or manage it.

---

## 5. Weekly/monthly profit & expense summary
Refined significantly after the Elizabeth interview (25/08) — this is no
longer a vague "monthly summary," it has a specific shape now:

- **Running totals, not a month-end batch calculation.** Totals update live
  as records are entered, not computed only when the farmer asks for them.
- **Category-level breakdown, not one net number.** Feed cost, drug/
  vaccination cost, egg revenue etc. shown separately, then rolled up —
  directly connects this feature to #1-3 rather than sitting on top of them.
- **Weekly cadence, with the month as the sum of 4 weeks.** Her own
  reasoning: weekly lets a farmer adjust "before things get bad by the end
  of the month." Monthly-only was the original assumption; weekly is what
  she actually asked for.

**Cross-cutting note, not a 6th feature**: Elizabeth said her manual
calculations sometimes don't balance because she forgot to record a sale or
expense — a data-completeness problem, not a math problem, and no summary
feature fixes it if entries are missing. Consider reusing the same
notification mechanism built for vaccination reminders (#4) to nudge
"nothing logged today/this week" — same infrastructure, different trigger.

---

## Confirmed target user (from Elizabeth's interview)

Solo operator doing all bookkeeping herself, no dedicated admin staff — "we
do almost all the managerial work by ourselves." Matches the broader survey
skew toward small-to-mid farms. Design for someone doing this alone, in
spare moments, not someone with time carved out for admin work.

---

## Pricing / willingness to pay

**Working model, decided**: free trial for initial users, converting to a
paid subscription afterward. Juliana's interview (25/08) is the basis for
this — asked directly whether her "very interested but won't pay" answer
meant wanting a free trial, not believing software should cost money, or
something else, she said: "I will like to try it and see how it works, if
it is better than my register." That's trial access, not outright price
rejection or distrust — she's comparing the app against her current free
method (a paper register) and wants proof it's better before committing.

**Still open**: the actual price point post-trial. The conversation ended
before the planned follow-up ("is there a price that would feel fair to
you") got asked, so there's no confirmed number for the ₦2,000-5,000/month
range, and Mathew's "won't pay anything" segment is still unaddressed —
worth checking whether a free trial converts him too, or whether he's a
different case. Trial length and what happens if someone doesn't convert
are also undecided.

**Banjo's interview — inconclusive, and now closed (25/08, confirmed
unreachable 31/08).** He's the plain "wouldn't pay" respondent on the
shortlist. Asked what would make a book keeping app worth paying for, he
responded by asking what "book keeping app" even meant — he keeps a
handwritten ledger and the concept of an app version of that didn't
immediately land. He stopped replying right after it was explained to
him, before giving a real answer, and has gone silent since — treat this
as permanently unresolved rather than a firm "no," not as something a
follow-up will close out. What it does confirm: he's self-reliant (solves
bird problems himself, never used a vet), avoids loans, and is not
chasing efficiency tools generally — consistent with him being outside
the target segment rather than a pricing objection specifically.

**Lateef was never reached at all** — the phone number from his survey
response isn't registered on WhatsApp, and per this project's "WhatsApp
text, not calls" working preference, that's treated as unreachable rather
than a reason to call him instead.

**Plan to resolve it**: run a second, dedicated payment survey later, once
the trial phase has real usage to look at — not on a fixed calendar date,
but triggered by the trial gaining traction (a time-in-trial threshold, or
a registered-to-active-user ratio, exact trigger TBD). That survey targets
real trial users' actual willingness to pay instead of the current
pre-launch, hypothetical survey answers.

---

## 6. Feed inventory + Feed Conversion Ratio (founder-directed, not interview-validated)

Added 17/09/2026, after a working `frontend-react` build (see
`docs/10-build-plan.md` §8) turned up already advertising and half-building
these — not from a new farmer interview. Flagged here explicitly because
this project's own working preference is to ground features in real data,
not generic feature-completeness, and this is the one exception so far:

- **Farm-level feed inventory** (`FeedPurchase`): what was bought into the
  farm's store, separate from what a batch consumes (`FeedLog`, already
  locked under #2). Stock-on-hand is derived from both, not stored.
- **Feed Conversion Ratio**: feed consumed ÷ weight gained. Needed a new
  input this project never asked a farmer about — periodic bird-weight
  sampling — since nothing tracked bird weight at all before this.

Neither of Elizabeth's, Juliana's, Toluwase's, or Ruth's interviews
mentioned feed inventory tracking or FCR as a pain point. This isn't
disqualifying — a working frontend already assuming these exist is its
own kind of signal — but it means these two shouldn't be cited as
validated findings the way #1-5 can be. Worth a real question in any
future farmer conversation: do farmers actually want FCR, or was it
built because it's a familiar poultry-industry metric rather than
something a farmer asked for?

---

## Explicitly out of scope for v1

Insurance/compliance export, loan/credit documentation, voice-based data
entry, buyer-facing traceability, vet-connection features, market/sales
access — each has at most one or two data points behind it, not a pattern.
Revisit only if a second batch of interviews starts repeating one of these
independently.
