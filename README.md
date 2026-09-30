# Care Flow — Discharge Readiness & Bed Turnover Coordination Board

Care Flow is a full-stack React + TypeScript hospital operations board for making discharge readiness, bed turnover, blockers, freshness, source conflicts, and safe-bed availability visible in one place. It is intentionally designed as a **synthetic-data demo environment**: no real patient information should be entered.

## Running locally

```bash
pnpm install
pnpm dev
```

The project is also configured for the managed WebDev preview and production build:

```bash
pnpm check
pnpm test
pnpm build
```

## Architecture

The frontend is a React 19 + Vite + Tailwind application using a persistent sidebar dashboard shell. Wouter handles the screen paths, while the main UI keeps the active demo workspace stable across navigation. The backend is an Express + tRPC server. `server/routers.ts` exposes the Care Flow snapshot, protected human actions, settings updates, demo progression, reset, and test-harness procedures.

The business rules live in `shared/careflow.ts`, not in individual UI components. This shared module owns the synthetic seed data, freshness evaluation, discharge-readiness evaluation, bed safety evaluation, role authorization, human actions, deterministic demo events, timestamped turnover metrics, audit records, and TC-001 through TC-010 assertions. The UI and the Vitest tests use the same engine.

## Quantitative bed turnover delay

Care Flow records `clinicalReadyAt` when a patient reaches a valid clinical discharge-ready state and `safeAvailableAt` only after an authorized human completes the safe-bed workflow. The measured metric is:

```text
Bed Turnover Delay = safeAvailableAt - clinicalReadyAt
```

Analytics and Turnover display the current measured value, the 96-minute synthetic baseline, the measured case count, and whether the value is Measured, Missing timestamp, Stale event, or Conflicting event. Missing, stale, conflicting, or revoked-order cases are not silently included in the measured value. The seed scenario includes a 78-minute measured case against the 96-minute baseline.

## Required screens

The application includes Login, Executive Dashboard, Bed Board, Discharge Readiness, Patients, Turnover, Alerts, Analytics, Experiment, Validation, Privacy & Access, Settings, Test Harness, and Demo Mode. The Login screen lets reviewers select one of the five supported operational roles for a synthetic workspace.

## Human-in-the-loop behavior

Care Flow never autonomously discharges a patient, marks a patient clinically ready, allocates a bed, overrides a clinician, marks a bed safe, resolves conflicting bed states, or completes cleaning/inspection. Protected actions are role-gated and recorded in the audit timeline. Conflicting values remain visible until a Bed Manager or Hospital Coordinator verifies them. Safe availability requires turnover evidence and human authorization.

## Freshness and conflict rules

The default freshness thresholds are 30 minutes for Aging and 90 minutes for Stale. These are editable in Settings, and the backend recalculates all patient and bed badges through the shared rule engine after a save. Missing inputs produce Missing, stale inputs produce Stale, and conflicting source values produce Conflicting. A bed system value of Available combined with an active facilities cleaning value is explicitly held in Conflict.

## Demo instructions

1. Open the preview and enter the workspace as Hospital Coordinator.
2. Review the Executive Dashboard priority queue.
3. Open Discharge Readiness and select Review on any patient to inspect source values, evidence, timeline, and the rule explanation.
4. Open Alerts and use Verify state to open a real evidence drawer.
5. Open Demo Mode and press **Next event** six times. The N2-14 scenario progresses through discharge confirmation, cleaning request, active cleaning, completion, inspection, and final safe availability. The final allocation remains a human decision.
6. Open Test Harness to view the real TC-001 through TC-010 results. The automated suite also covers conflicting bed state, sudden order revocation, stale telemetry, measured turnover delay, and audit payload shape.

## Synthetic data

Records use fabricated IDs such as `CF-1042`, wards such as North 2, and deterministic timestamps anchored to the demo scenario clock. Each patient and bed includes a stable ID, location, current state, freshness, blocker/reason, responsible role, evidence, source values where applicable, and a timeline.

## Validation and privacy notes

The Privacy & Access screen explains synthetic-data boundaries, least-privilege access, auditability, source traceability, and human control. The Validation screen provides stakeholder roles, validation questions, acceptance criteria, and a feedback area. Experiment metrics clearly distinguish observed synthetic demo state from simulated baseline/prototype comparison values.

## Database migrations and audit logging

The Drizzle schema now includes `auditLogs`, with migration `drizzle/0001_mushy_rhodey.sql`. The migration creates a persistent audit table containing user/role, action, record ID, previous state, new state, reason, and timestamp. The migration was applied to the project database. Authorized tRPC actions persist audit records through `server/db.ts`; when a local database is unavailable, the app remains usable in synthetic demo mode and keeps its in-memory audit timeline.

Clinical order revocation is a clinician-only protected action. It clears clinical readiness, returns the linked bed to Occupied, clears safe availability, and records the reason. Unauthorized roles are rejected by the shared `canAction` gate before any state mutation or audit write.

## Verification

The completed project was validated with:

- `pnpm check` — TypeScript passed.
- `pnpm test` — 2 test files and 10 tests passed, including all ten product assertions inside the shared harness plus conflict, revocation, stale telemetry, metric, and audit regressions.
- `pnpm build` — Vite frontend and bundled Express server built successfully after the metric and audit changes.
- Live preview smoke test — Login, dashboard rendering, navigation to Discharge Readiness, and evidence drawer opening verified.

The production build emits a non-blocking bundle-size warning for the single dashboard chunk; it does not prevent a successful build or preview.
