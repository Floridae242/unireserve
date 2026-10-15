# Local & CI verification — member5

Branch: `titan`; executed on local working tree and verified on GitHub Actions CI. Node 26.10.0, npm 11.19.1.

| Check | Result |
|---|---|
| `npm run typecheck` | Passed (0 errors) |
| `npm test` | **22 passed, 0 failed** (9 unit tests, 13 HTTP integration tests) |
| `npm audit` | 0 vulnerabilities reported |
| Review Service logic (TS-08) | Owner can review completed booking with rating 1–5 -> 201 Created |
| Review Service logic (TS-09) | Non-owner review rejected -> 403 FORBIDDEN |
| Review Service logic (TS-10) | Duplicate review for same booking rejected -> 409 REVIEW_ALREADY_EXISTS |
| Review Service logic (state) | Review of non-completed booking (CONFIRMED/CANCELLED) -> 409 BOOKING_NOT_COMPLETED |
| Resource & User queries | `GET /reviews/resource/:id` and `GET /reviews/user/:id` return reviews newest first |
| Authorization & Access | Other users cannot view another user's review list (403), Admin can view all |
| Input validation & limits | Rating outside 1-5, decimals, invalid JSON, payload > 8KB handled cleanly |
| Service dependencies | Auth failure -> 503 AUTH_UNAVAILABLE; Booking failure -> 503 BOOKING_UNAVAILABLE |
| Health check | `GET /health` returns 200 `{ status: "ok", service: "review" }` |
| **Member5 Review CI (Remote)** | [success (run 38700360740)](https://github.com/Floridae242/unireserve/actions/runs/38700360740) — typecheck, test, docker build, container health smoke passed |
| **Integration Tests (Remote)** | [success (run 38700360602)](https://github.com/Floridae242/unireserve/actions/runs/38700360602) — **26/26 passed**, รวม TS-08, TS-09, TS-10, RF-REV-01, RF-REV-02 |
