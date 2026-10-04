// Bundles each Lambda entry point into its own dist/<name>/index.js.
// The output directory names here are the contract with infra/lambda.tf —
// each one becomes the zip Terraform deploys for that function.
const esbuild = require("esbuild");
const path = require("path");

const entries = {
  batches: "src/handlers/batches/index.ts",
  farms: "src/handlers/farms/index.ts",
  mortality: "src/handlers/mortality/index.ts",
  feed: "src/handlers/feed/index.ts",
  eggs: "src/handlers/eggs/index.ts",
  weight: "src/handlers/weight/index.ts",
  "sick-bay": "src/handlers/sickBay/index.ts",
  "feed-stock": "src/handlers/feedStock/index.ts",
  vaccinations: "src/handlers/vaccinations/index.ts",
  "vaccination-schedule": "src/handlers/vaccinationSchedule/index.ts",
  summary: "src/handlers/summary/index.ts",
  sync: "src/handlers/sync/index.ts",
  "auth-otp-request": "src/handlers/auth/otpRequest.ts",
  "auth-otp-verify": "src/handlers/auth/otpVerify.ts",
  "auth-trigger-define-challenge": "src/handlers/authTriggers/defineAuthChallenge.ts",
  "auth-trigger-create-challenge": "src/handlers/authTriggers/createAuthChallenge.ts",
  "auth-trigger-verify-challenge": "src/handlers/authTriggers/verifyAuthChallengeResponse.ts",
  "scheduled-vaccination-reminders": "src/handlers/scheduled/vaccinationReminders.ts",
  "scheduled-entry-nudges": "src/handlers/scheduled/entryNudges.ts",
};

async function main() {
  for (const [name, entry] of Object.entries(entries)) {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      outfile: path.join("dist", name, "index.js"),
      sourcemap: false,
      minify: false,
    });
    console.log(`built ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
